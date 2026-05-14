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

import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SmartHQAuthClient, ApplianceInfo } from './api/authClient';
import { SmartHQClient } from './api/wsClient';
import { ErdApplianceType } from './api/erdCodes';

import { RefrigeratorAccessory } from './accessories/refrigerator';
import { OvenAccessory }         from './accessories/oven';
import { DishwasherAccessory }   from './accessories/dishwasher';
import { LaundryAccessory }      from './accessories/laundry';
import { AirConditionerAccessory } from './accessories/airConditioner';

export interface SmartHQConfig extends PlatformConfig {
  username: string;
  password: string;
  region: 'US' | 'EU';
  refreshInterval: number;
  debug: boolean;
}

export class SmartHQPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  /** Cached accessories from previous Homebridge runs */
  private readonly cachedAccessories: Map<string, PlatformAccessory> = new Map();

  private authClient!: SmartHQAuthClient;
  private wsClient!: SmartHQClient;
  private readonly config: SmartHQConfig;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service        = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.config         = config as SmartHQConfig;

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
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Restoring cached accessory: ${accessory.displayName}`);
    this.cachedAccessories.set(accessory.UUID, accessory);
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    this.authClient = new SmartHQAuthClient(
      this.config.username,
      this.config.password,
      this.config.region ?? 'US',
    );

    this.wsClient = new SmartHQClient(
      this.authClient,
      this.log,
      this.config.debug ?? false,
    );

    this.wsClient.on('applianceList', (appliances: ApplianceInfo[]) => {
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

  private registerAppliances(appliances: ApplianceInfo[]): void {
    const seenUUIDs = new Set<string>();

    for (const appliance of appliances) {
      const uuid = this.api.hap.uuid.generate(appliance.applianceId);
      seenUUIDs.add(uuid);

      let platformAccessory = this.cachedAccessories.get(uuid);

      if (!platformAccessory) {
        this.log.info(`Registering new appliance: ${appliance.nickname} (${appliance.applianceId})`);
        platformAccessory = new this.api.platformAccessory(
          appliance.nickname || `GE Appliance ${appliance.applianceId}`,
          uuid,
        );
        platformAccessory.context.applianceInfo = appliance;
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [platformAccessory]);
      } else {
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
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        this.cachedAccessories.delete(uuid);
      }
    }
  }

  private createAccessory(acc: PlatformAccessory, info: ApplianceInfo): void {
    const interval = this.config.refreshInterval ?? 30;

    // Normalize appliance type to lowercase hex for comparison
    const rawType = (info.applianceType ?? '').toLowerCase().replace('0x', '');
    const appType = `0x${rawType}`;

    this.log.debug(`Appliance type for ${info.nickname}: ${appType}`);

    switch (appType) {
      case ErdApplianceType.REFRIGERATOR.toLowerCase():
        new RefrigeratorAccessory(this, acc, this.wsClient, info, interval);
        break;

      case ErdApplianceType.RANGE.toLowerCase():
      case ErdApplianceType.ADVANTIUM.toLowerCase():
        new OvenAccessory(this, acc, this.wsClient, info, interval);
        break;

      case ErdApplianceType.DISHWASHER.toLowerCase():
        new DishwasherAccessory(this, acc, this.wsClient, info, interval);
        break;

      case ErdApplianceType.WASHER.toLowerCase():
      case ErdApplianceType.DRYER.toLowerCase():
        new LaundryAccessory(this, acc, this.wsClient, info, interval);
        break;

      case ErdApplianceType.AIR_CONDITIONER.toLowerCase():
        new AirConditionerAccessory(this, acc, this.wsClient, info, interval);
        break;

      default:
        this.log.warn(
          `SmartHQ: unsupported appliance type ${appType} for "${info.nickname}". ` +
          'The accessory will appear in HomeKit but with no controls.',
        );
        // Register a bare accessory with just AccessoryInformation so it shows up
        acc.getService(this.Service.AccessoryInformation)!
          .setCharacteristic(this.Characteristic.Manufacturer, 'GE Appliances')
          .setCharacteristic(this.Characteristic.Model, info.modelNumber || 'SmartHQ')
          .setCharacteristic(this.Characteristic.SerialNumber, info.serialNumber || info.applianceId);
        break;
    }
  }
}
