/**
 * SmartHQ Homebridge Platform
 *
 * Handles:
 *  1. Plugin registration with Homebridge
 *  2. Config parsing and validation
 *  3. SmartHQ auth + WebSocket client lifecycle
 *  4. Dynamic accessory creation based on ErdApplianceType
 *  5. Cached accessory restoration between restarts
 */
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
export interface SmartHQConfig extends PlatformConfig {
    username: string;
    password: string;
    region: 'US' | 'EU';
    refreshInterval: number;
    debug: boolean;
}
export declare class SmartHQPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    /** Cached accessories from previous Homebridge runs */
    private readonly cachedAccessories;
    private authClient;
    private wsClient;
    private readonly config;
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private init;
    private registerAppliances;
    private createAccessory;
}
