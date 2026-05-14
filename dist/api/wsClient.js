"use strict";
/**
 * SmartHQ WebSocket Client
 *
 * Maintains a persistent WebSocket connection to the GE SmartHQ cloud.
 * The WSS "MQTT" API wraps the REST API with push subscriptions so we
 * get IoT Cloud Push instead of constant polling.
 *
 * Message format (JSON over WSS):
 *   Incoming ERD update:
 *     { kind: "publish#erd", item: { applianceId, erd, value } }
 *   Subscribe to appliance:
 *     { kind: "subscribe", item: { applianceId } }
 *   Request full cache:
 *     { kind: "get#erd", item: { applianceId, erd: "allERDs" } }
 *   Set ERD value:
 *     { kind: "set#erd", item: { applianceId, erd, value } }
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartHQClient = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
// ─── Events emitted by SmartHQClient ─────────────────────────────────────────
// 'applianceList'    (appliances: ApplianceInfo[])
// 'erdUpdate'        (update: ErdUpdate)
// 'connected'        ()
// 'disconnected'     ()
class SmartHQClient extends events_1.EventEmitter {
    constructor(auth, log, debug = false) {
        super();
        this.auth = auth;
        this.log = log;
        this.debug = debug;
        this.ws = null;
        this.credentials = null;
        this.appliances = [];
        this.state = new Map();
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.reconnectDelay = 5000; // ms, backs off up to 60s
        this.stopped = false;
    }
    // ── Public API ────────────────────────────────────────────────────────────────
    async start() {
        this.stopped = false;
        await this.connect();
    }
    stop() {
        this.stopped = true;
        this.clearTimers();
        this.ws?.close();
        this.ws = null;
    }
    getApplianceList() {
        return [...this.appliances];
    }
    getErdValue(applianceId, erd) {
        return this.state.get(applianceId)?.get(erd.toLowerCase());
    }
    async setErdValue(applianceId, erd, value) {
        const msg = {
            kind: 'set#erd',
            item: {
                applianceId,
                erd: erd.toLowerCase(),
                value,
            },
        };
        this.sendMessage(msg);
    }
    async requestUpdate(applianceId) {
        const msg = {
            kind: 'get#erd',
            item: { applianceId, erd: 'allERDs' },
        };
        this.sendMessage(msg);
    }
    // ── Connection lifecycle ──────────────────────────────────────────────────────
    async connect() {
        try {
            this.credentials = await this.auth.getValidCredentials();
            this.appliances = await this.auth.getAppliances(this.credentials.accessToken);
            this.emit('applianceList', this.appliances);
            this.debugLog(`Found ${this.appliances.length} appliance(s)`);
            this.openWebSocket();
        }
        catch (err) {
            this.log.error(`SmartHQ connection error: ${err}`);
            this.scheduleReconnect();
        }
    }
    openWebSocket() {
        if (!this.credentials)
            return;
        const url = `${this.credentials.wssUrl}?access_token=${this.credentials.wssToken}`;
        this.debugLog(`Connecting to WSS: ${this.credentials.wssUrl}`);
        this.ws = new ws_1.default(url, {
            headers: { 'User-Agent': 'Homebridge-SmartHQ/1.0' },
        });
        this.ws.on('open', () => this.onOpen());
        this.ws.on('message', (data) => this.onMessage(data.toString()));
        this.ws.on('error', (err) => this.onError(err));
        this.ws.on('close', (code, reason) => this.onClose(code, reason.toString()));
    }
    onOpen() {
        this.log.info('SmartHQ WebSocket connected');
        this.reconnectDelay = 5000;
        this.emit('connected');
        // Subscribe to each appliance and request full cache
        for (const appliance of this.appliances) {
            this.sendMessage({
                kind: 'subscribe',
                item: { applianceId: appliance.applianceId },
            });
            this.requestUpdate(appliance.applianceId);
        }
        // Keep-alive ping every 30s
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === ws_1.default.OPEN) {
                this.ws.ping();
            }
        }, 30000);
    }
    onMessage(raw) {
        this.debugLog(`WS RX: ${raw}`);
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            this.log.warn(`SmartHQ: unparseable WS message: ${raw}`);
            return;
        }
        const kind = msg['kind'];
        if (kind === 'publish#erd' || kind === 'update#erd') {
            const item = msg['item'];
            if (!item)
                return;
            const update = {
                applianceId: item['applianceId'] ?? '',
                erd: (item['erd'] ?? '').toLowerCase(),
                value: (item['value'] ?? '').toLowerCase(),
            };
            if (!update.applianceId || !update.erd)
                return;
            // Update local cache
            if (!this.state.has(update.applianceId)) {
                this.state.set(update.applianceId, new Map());
            }
            this.state.get(update.applianceId).set(update.erd, update.value);
            this.emit('erdUpdate', update);
        }
        else if (kind === 'response#erd' || kind === 'cache#erd') {
            // Bulk cache response — item is a dict of erd→value
            const item = msg['item'];
            if (!item)
                return;
            const applianceId = (item['applianceId'] ?? '');
            const erds = item['items'] ?? item;
            for (const [erd, value] of Object.entries(erds)) {
                if (erd === 'applianceId')
                    continue;
                const update = {
                    applianceId,
                    erd: erd.toLowerCase(),
                    value: String(value ?? '').toLowerCase(),
                };
                if (!this.state.has(applianceId))
                    this.state.set(applianceId, new Map());
                this.state.get(applianceId).set(update.erd, update.value);
                this.emit('erdUpdate', update);
            }
        }
    }
    onError(err) {
        this.log.error(`SmartHQ WebSocket error: ${err.message}`);
    }
    onClose(code, reason) {
        this.log.warn(`SmartHQ WebSocket closed (code=${code}, reason=${reason})`);
        this.clearTimers();
        this.emit('disconnected');
        if (!this.stopped) {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.stopped)
            return;
        this.log.info(`SmartHQ: reconnecting in ${this.reconnectDelay / 1000}s...`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000);
            await this.connect();
        }, this.reconnectDelay);
    }
    clearTimers() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    sendMessage(payload) {
        if (this.ws?.readyState !== ws_1.default.OPEN) {
            this.log.warn('SmartHQ: tried to send message but WS not open');
            return;
        }
        const raw = JSON.stringify(payload);
        this.debugLog(`WS TX: ${raw}`);
        this.ws.send(raw);
    }
    debugLog(msg) {
        if (this.debug)
            this.log.debug(`[SmartHQ] ${msg}`);
    }
}
exports.SmartHQClient = SmartHQClient;
