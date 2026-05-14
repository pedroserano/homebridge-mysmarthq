/**
 * Base SmartHQ Accessory
 *
 * All appliance accessories extend this class. It wires up:
 *  - Homebridge PlatformAccessory lifecycle
 *  - ERD update event subscription from SmartHQClient
 *  - Polling fallback (requestUpdate) on configurable interval
 */

import {
  PlatformAccessory,
  Service,
  CharacteristicValue,
  Logger,
} from 'homebridge';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient, ErdUpdate } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';

export abstract class BaseAccessory {
  protected readonly service: Service;
  protected readonly log: Logger;

  constructor(
    protected readonly platform: SmartHQPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly client: SmartHQClient,
    protected readonly applianceInfo: ApplianceInfo,
    protected readonly refreshInterval: number,
  ) {
    this.log = platform.log;

    // Accessory Information service
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'GE Appliances')
      .setCharacteristic(this.platform.Characteristic.Model, applianceInfo.modelNumber || 'SmartHQ')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, applianceInfo.serialNumber || applianceInfo.applianceId)
      .setCharacteristic(this.platform.Characteristic.Name, applianceInfo.nickname);

    this.service = this.setupServices();

    // Subscribe to real-time ERD updates
    this.client.on('erdUpdate', (update: ErdUpdate) => {
      if (update.applianceId === this.applianceInfo.applianceId) {
        this.onErdUpdate(update.erd, update.value);
      }
    });

    // Polling fallback
    setInterval(() => {
      this.client.requestUpdate(this.applianceInfo.applianceId);
    }, this.refreshInterval * 1000);
  }

  /** Subclasses must set up and return their primary Service */
  protected abstract setupServices(): Service;

  /** Called whenever any ERD value changes for this appliance */
  protected abstract onErdUpdate(erd: string, value: string): void;

  /** Helper: get current ERD value from cache */
  protected getErd(erd: string): string {
    return this.client.getErdValue(this.applianceInfo.applianceId, erd) ?? '';
  }

  /** Helper: set ERD value via WebSocket */
  protected async setErd(erd: string, value: string): Promise<void> {
    await this.client.setErdValue(this.applianceInfo.applianceId, erd, value);
  }

  /** Shorthand for Characteristic access */
  protected get Characteristic() {
    return this.platform.Characteristic;
  }

  protected get Service() {
    return this.platform.Service;
  }

  protected debugLog(msg: string): void {
    this.log.debug(`[${this.applianceInfo.nickname}] ${msg}`);
  }
}
