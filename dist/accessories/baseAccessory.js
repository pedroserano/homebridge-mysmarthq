"use strict";
/**
 * Base SmartHQ Accessory
 *
 * All appliance accessories extend this class. It wires up:
 *  - Homebridge PlatformAccessory lifecycle
 *  - ERD update event subscription from SmartHQClient
 *  - Polling fallback (requestUpdate) on configurable interval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAccessory = void 0;
class BaseAccessory {
    constructor(platform, accessory, client, applianceInfo, refreshInterval) {
        this.platform = platform;
        this.accessory = accessory;
        this.client = client;
        this.applianceInfo = applianceInfo;
        this.refreshInterval = refreshInterval;
        this.log = platform.log;
        // Accessory Information service
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'GE Appliances')
            .setCharacteristic(this.platform.Characteristic.Model, applianceInfo.modelNumber || 'SmartHQ')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, applianceInfo.serialNumber || applianceInfo.applianceId)
            .setCharacteristic(this.platform.Characteristic.Name, applianceInfo.nickname);
        this.service = this.setupServices();
        // Subscribe to real-time ERD updates
        this.client.on('erdUpdate', (update) => {
            if (update.applianceId === this.applianceInfo.applianceId) {
                this.onErdUpdate(update.erd, update.value);
            }
        });
        // Polling fallback
        setInterval(() => {
            this.client.requestUpdate(this.applianceInfo.applianceId);
        }, this.refreshInterval * 1000);
    }
    /** Helper: get current ERD value from cache */
    getErd(erd) {
        return this.client.getErdValue(this.applianceInfo.applianceId, erd) ?? '';
    }
    /** Helper: set ERD value via WebSocket */
    async setErd(erd, value) {
        await this.client.setErdValue(this.applianceInfo.applianceId, erd, value);
    }
    /** Shorthand for Characteristic access */
    get Characteristic() {
        return this.platform.Characteristic;
    }
    get Service() {
        return this.platform.Service;
    }
    debugLog(msg) {
        this.log.debug(`[${this.applianceInfo.nickname}] ${msg}`);
    }
}
exports.BaseAccessory = BaseAccessory;
