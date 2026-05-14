/**
 * Base SmartHQ Accessory
 *
 * All appliance accessories extend this class. It wires up:
 *  - Homebridge PlatformAccessory lifecycle
 *  - ERD update event subscription from SmartHQClient
 *  - Polling fallback (requestUpdate) on configurable interval
 */
import { PlatformAccessory, Service, Logger } from 'homebridge';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
export declare abstract class BaseAccessory {
    protected readonly platform: SmartHQPlatform;
    protected readonly accessory: PlatformAccessory;
    protected readonly client: SmartHQClient;
    protected readonly applianceInfo: ApplianceInfo;
    protected readonly refreshInterval: number;
    protected readonly service: Service;
    protected readonly log: Logger;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    /** Subclasses must set up and return their primary Service */
    protected abstract setupServices(): Service;
    /** Called whenever any ERD value changes for this appliance */
    protected abstract onErdUpdate(erd: string, value: string): void;
    /** Helper: get current ERD value from cache */
    protected getErd(erd: string): string;
    /** Helper: set ERD value via WebSocket */
    protected setErd(erd: string, value: string): Promise<void>;
    /** Shorthand for Characteristic access */
    protected get Characteristic(): typeof import("homebridge").Characteristic;
    protected get Service(): typeof Service;
    protected debugLog(msg: string): void;
}
