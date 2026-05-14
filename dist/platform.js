"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartHQPlatform = void 0;
const settings_1 = require("./settings");
const authClient_1 = require("./api/authClient");
const wsClient_1 = require("./api/wsClient");
const erdCodes_1 = require("./api/erdCodes");
const refrigerator_1 = require("./accessories/refrigerator");
const oven_1 = require("./accessories/oven");
const dishwasher_1 = require("./accessories/dishwasher");
const laundry_1 = require("./accessories/laundry");
const airConditioner_1 = require("./accessories/airConditioner");
class SmartHQPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        /** Cached accessories from previous Homebridge runs */
        this.cachedAccessories = new Map();
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.config = config;
        // Validate required config
        if (!this.config.username || !this.config.password) {
            this.log.error('SmartHQ: username and password are required in config.json');
            return;
        }
        this.log.info('SmartHQ platform initialised, waiting for Homebridge to finish launching...');
        // Homebridge calls `didFinishLaunching` once all cached accessories are restored
        this.api.on('didFinishLaunching', () => {
            this.log.info('SmartHQ: Homebridge finished launching, connecting to SmartHQ...');
            this.init().catch(err => this.log.error(`SmartHQ init error: ${err}`));
        });
    }
    // Called by Homebridge to restore cached accessories
    configureAccessory(accessory) {
        this.log.info(`Restoring cached accessory: ${accessory.displayName}`);
        this.cachedAccessories.set(accessory.UUID, accessory);
    }
    // ── Initialisation ────────────────────────────────────────────────────────
    async init() {
        this.authClient = new authClient_1.SmartHQAuthClient(this.config.username, this.config.password, this.config.region ?? 'US');
        this.wsClient = new wsClient_1.SmartHQClient(this.authClient, this.log, this.config.debug ?? false);
        this.wsClient.on('applianceList', (appliances) => {
            this.registerAppliances(appliances);
        });
        this.wsClient.on('connected', () => {
            this.log.info('SmartHQ: connected');
        });
        this.wsClient.on('disconnected', () => {
            this.log.warn('SmartHQ: disconnected (will auto-reconnect)');
        });
        await this.wsClient.start();
    }
    // ── Accessory registration ─────────────────────────────────────────────────
    registerAppliances(appliances) {
        const seenUUIDs = new Set();
        for (const appliance of appliances) {
            const uuid = this.api.hap.uuid.generate(appliance.applianceId);
            seenUUIDs.add(uuid);
            let platformAccessory = this.cachedAccessories.get(uuid);
            if (!platformAccessory) {
                this.log.info(`Registering new appliance: ${appliance.nickname} (${appliance.applianceId})`);
                platformAccessory = new this.api.platformAccessory(appliance.nickname || `GE Appliance ${appliance.applianceId}`, uuid);
                platformAccessory.context.applianceInfo = appliance;
                this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [platformAccessory]);
            }
            else {
                // Update stored info in case nickname changed
                platformAccessory.context.applianceInfo = appliance;
                this.log.info(`Restoring appliance: ${appliance.nickname}`);
            }
            this.createAccessory(platformAccessory, appliance);
        }
        // Remove cached accessories that are no longer in the appliance list
        for (const [uuid, acc] of this.cachedAccessories) {
            if (!seenUUIDs.has(uuid)) {
                this.log.info(`Removing stale accessory: ${acc.displayName}`);
                this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [acc]);
                this.cachedAccessories.delete(uuid);
            }
        }
    }
    createAccessory(acc, info) {
        const interval = this.config.refreshInterval ?? 30;
        // Normalize appliance type to lowercase hex for comparison
        const rawType = (info.applianceType ?? '').toLowerCase().replace('0x', '');
        const appType = `0x${rawType}`;
        this.log.debug(`Appliance type for ${info.nickname}: ${appType}`);
        switch (appType) {
            case erdCodes_1.ErdApplianceType.REFRIGERATOR.toLowerCase():
                new refrigerator_1.RefrigeratorAccessory(this, acc, this.wsClient, info, interval);
                break;
            case erdCodes_1.ErdApplianceType.RANGE.toLowerCase():
            case erdCodes_1.ErdApplianceType.ADVANTIUM.toLowerCase():
                new oven_1.OvenAccessory(this, acc, this.wsClient, info, interval);
                break;
            case erdCodes_1.ErdApplianceType.DISHWASHER.toLowerCase():
                new dishwasher_1.DishwasherAccessory(this, acc, this.wsClient, info, interval);
                break;
            case erdCodes_1.ErdApplianceType.WASHER.toLowerCase():
            case erdCodes_1.ErdApplianceType.DRYER.toLowerCase():
                new laundry_1.LaundryAccessory(this, acc, this.wsClient, info, interval);
                break;
            case erdCodes_1.ErdApplianceType.AIR_CONDITIONER.toLowerCase():
                new airConditioner_1.AirConditionerAccessory(this, acc, this.wsClient, info, interval);
                break;
            default:
                this.log.warn(`SmartHQ: unsupported appliance type ${appType} for "${info.nickname}". ` +
                    'The accessory will appear in HomeKit but with no controls.');
                // Register a bare accessory with just AccessoryInformation so it shows up
                acc.getService(this.Service.AccessoryInformation)
                    .setCharacteristic(this.Characteristic.Manufacturer, 'GE Appliances')
                    .setCharacteristic(this.Characteristic.Model, info.modelNumber || 'SmartHQ')
                    .setCharacteristic(this.Characteristic.SerialNumber, info.serialNumber || info.applianceId);
                break;
        }
    }
}
exports.SmartHQPlatform = SmartHQPlatform;
