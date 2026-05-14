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
import { EventEmitter } from 'events';
import { SmartHQAuthClient, ApplianceInfo } from './authClient';
import { Logger } from 'homebridge';
export type ErdState = Map<string, string>;
export interface ErdUpdate {
    applianceId: string;
    erd: string;
    value: string;
}
export type ApplianceStateMap = Map<string, ErdState>;
export declare class SmartHQClient extends EventEmitter {
    private readonly auth;
    private readonly log;
    private readonly debug;
    private ws;
    private credentials;
    private appliances;
    private state;
    private reconnectTimer;
    private pingTimer;
    private reconnectDelay;
    private stopped;
    constructor(auth: SmartHQAuthClient, log: Logger, debug?: boolean);
    start(): Promise<void>;
    stop(): void;
    getApplianceList(): ApplianceInfo[];
    getErdValue(applianceId: string, erd: string): string | undefined;
    setErdValue(applianceId: string, erd: string, value: string): Promise<void>;
    requestUpdate(applianceId: string): Promise<void>;
    private connect;
    private openWebSocket;
    private onOpen;
    private onMessage;
    private onError;
    private onClose;
    private scheduleReconnect;
    private clearTimers;
    private sendMessage;
    private debugLog;
}
