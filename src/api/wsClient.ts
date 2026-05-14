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

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { SmartHQAuthClient, ApplianceInfo, SmartHQCredentials } from './authClient';
import { Logger } from 'homebridge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ErdState = Map<string, string>;  // erd_code → hex_value

export interface ErdUpdate {
  applianceId: string;
  erd: string;
  value: string;
}

export type ApplianceStateMap = Map<string, ErdState>; // applianceId → ErdState

// ─── Events emitted by SmartHQClient ─────────────────────────────────────────
// 'applianceList'    (appliances: ApplianceInfo[])
// 'erdUpdate'        (update: ErdUpdate)
// 'connected'        ()
// 'disconnected'     ()

export class SmartHQClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private credentials: SmartHQCredentials | null = null;
  private appliances: ApplianceInfo[] = [];
  private state: ApplianceStateMap = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 5_000;  // ms, backs off up to 60s
  private stopped = false;

  constructor(
    private readonly auth: SmartHQAuthClient,
    private readonly log: Logger,
    private readonly debug: boolean = false,
  ) {
    super();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
  }

  getApplianceList(): ApplianceInfo[] {
    return [...this.appliances];
  }

  getErdValue(applianceId: string, erd: string): string | undefined {
    return this.state.get(applianceId)?.get(erd.toLowerCase());
  }

  async setErdValue(applianceId: string, erd: string, value: string): Promise<void> {
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

  async requestUpdate(applianceId: string): Promise<void> {
    const msg = {
      kind: 'get#erd',
      item: { applianceId, erd: 'allERDs' },
    };
    this.sendMessage(msg);
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    try {
      this.credentials = await this.auth.getValidCredentials();
      this.appliances  = await this.auth.getAppliances(this.credentials.accessToken);

      this.emit('applianceList', this.appliances);
      this.debugLog(`Found ${this.appliances.length} appliance(s)`);

      this.openWebSocket();
    } catch (err) {
      this.log.error(`SmartHQ connection error: ${err}`);
      this.scheduleReconnect();
    }
  }

  private openWebSocket(): void {
    if (!this.credentials) return;

    const url = `${this.credentials.wssUrl}?access_token=${this.credentials.wssToken}`;
    this.debugLog(`Connecting to WSS: ${this.credentials.wssUrl}`);

    this.ws = new WebSocket(url, {
      headers: { 'User-Agent': 'Homebridge-SmartHQ/1.0' },
    });

    this.ws.on('open',    ()           => this.onOpen());
    this.ws.on('message', (data)       => this.onMessage(data.toString()));
    this.ws.on('error',   (err)        => this.onError(err));
    this.ws.on('close',   (code, reason) => this.onClose(code, reason.toString()));
  }

  private onOpen(): void {
    this.log.info('SmartHQ WebSocket connected');
    this.reconnectDelay = 5_000;
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
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30_000);
  }

  private onMessage(raw: string): void {
    this.debugLog(`WS RX: ${raw}`);

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.log.warn(`SmartHQ: unparseable WS message: ${raw}`);
      return;
    }

    const kind = msg['kind'] as string;

    if (kind === 'publish#erd' || kind === 'update#erd') {
      const item = msg['item'] as Record<string, string> | undefined;
      if (!item) return;

      const update: ErdUpdate = {
        applianceId: item['applianceId'] ?? '',
        erd:         (item['erd']   ?? '').toLowerCase(),
        value:       (item['value'] ?? '').toLowerCase(),
      };

      if (!update.applianceId || !update.erd) return;

      // Update local cache
      if (!this.state.has(update.applianceId)) {
        this.state.set(update.applianceId, new Map());
      }
      this.state.get(update.applianceId)!.set(update.erd, update.value);

      this.emit('erdUpdate', update);

    } else if (kind === 'response#erd' || kind === 'cache#erd') {
      // Bulk cache response — item is a dict of erd→value
      const item = msg['item'] as Record<string, unknown> | undefined;
      if (!item) return;

      const applianceId = (item['applianceId'] as string ?? '');
      const erds = item['items'] as Record<string, string> | undefined ?? item;

      for (const [erd, value] of Object.entries(erds)) {
        if (erd === 'applianceId') continue;
        const update: ErdUpdate = {
          applianceId,
          erd:   erd.toLowerCase(),
          value: String(value ?? '').toLowerCase(),
        };
        if (!this.state.has(applianceId)) this.state.set(applianceId, new Map());
        this.state.get(applianceId)!.set(update.erd, update.value);
        this.emit('erdUpdate', update);
      }
    }
  }

  private onError(err: Error): void {
    this.log.error(`SmartHQ WebSocket error: ${err.message}`);
  }

  private onClose(code: number, reason: string): void {
    this.log.warn(`SmartHQ WebSocket closed (code=${code}, reason=${reason})`);
    this.clearTimers();
    this.emit('disconnected');

    if (!this.stopped) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.log.info(`SmartHQ: reconnecting in ${this.reconnectDelay / 1000}s...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60_000);
      await this.connect();
    }, this.reconnectDelay);
  }

  private clearTimers(): void {
    if (this.pingTimer)      { clearInterval(this.pingTimer);   this.pingTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private sendMessage(payload: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.log.warn('SmartHQ: tried to send message but WS not open');
      return;
    }
    const raw = JSON.stringify(payload);
    this.debugLog(`WS TX: ${raw}`);
    this.ws.send(raw);
  }

  private debugLog(msg: string): void {
    if (this.debug) this.log.debug(`[SmartHQ] ${msg}`);
  }
}
