/**
 * Refrigerator Accessory
 *
 * Exposes via HomeKit:
 *  - Fridge temperature (TemperatureSensor service)
 *  - Freezer temperature (TemperatureSensor service)
 *  - Fridge door status (ContactSensor service)
 *  - Freezer door status (ContactSensor service)
 *  - Ice maker status (Switch service)
 *
 * ERD references:
 *  0x1003  FREEZER_TEMP     (signed 16-bit, °F)
 *  0x1004  FRESH_FOOD_TEMP  (signed 16-bit, °F)
 *  0x1005  FRIDGE_TARGET    (signed 16-bit, °F)
 *  0x100a  FREEZER_TARGET   (signed 16-bit, °F)
 *  0x1007  DOOR_STATUS      (bitmask)
 *  0x1013  ICE_MAKER_ENABLE (bool)
 */

import { PlatformAccessory, Service } from 'homebridge';
import { BaseAccessory } from './baseAccessory';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
import { ErdFridge } from '../api/erdCodes';
import {
  hexToInt,
  fahrenheitToCelsius,
  decodeDoorStatus,
  hexToBool,
  boolToHex,
} from '../utils/erdHelpers';

export class RefrigeratorAccessory extends BaseAccessory {
  private fridgeTempService!: Service;
  private freezerTempService!: Service;
  private fridgeDoorService!: Service;
  private freezerDoorService!: Service;
  private iceMakerService!: Service;

  constructor(
    platform: SmartHQPlatform,
    accessory: PlatformAccessory,
    client: SmartHQClient,
    applianceInfo: ApplianceInfo,
    refreshInterval: number,
  ) {
    super(platform, accessory, client, applianceInfo, refreshInterval);
  }

  protected setupServices(): Service {
    // ── Fridge Temperature ──────────────────────────────────────────────────
    this.fridgeTempService = (
      this.accessory.getService('Fridge Temperature') ??
      this.accessory.addService(this.Service.TemperatureSensor, 'Fridge Temperature', 'fridge-temp')
    );
    this.fridgeTempService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => this.getFridgeTemp());

    // ── Freezer Temperature ─────────────────────────────────────────────────
    this.freezerTempService = (
      this.accessory.getService('Freezer Temperature') ??
      this.accessory.addService(this.Service.TemperatureSensor, 'Freezer Temperature', 'freezer-temp')
    );
    this.freezerTempService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(() => this.getFreezerTemp());

    // ── Fridge Door ─────────────────────────────────────────────────────────
    this.fridgeDoorService = (
      this.accessory.getService('Fridge Door') ??
      this.accessory.addService(this.Service.ContactSensor, 'Fridge Door', 'fridge-door')
    );

    // ── Freezer Door ────────────────────────────────────────────────────────
    this.freezerDoorService = (
      this.accessory.getService('Freezer Door') ??
      this.accessory.addService(this.Service.ContactSensor, 'Freezer Door', 'freezer-door')
    );

    // ── Ice Maker ───────────────────────────────────────────────────────────
    this.iceMakerService = (
      this.accessory.getService('Ice Maker') ??
      this.accessory.addService(this.Service.Switch, 'Ice Maker', 'ice-maker')
    );
    this.iceMakerService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.getIceMaker())
      .onSet(async (val) => this.setIceMaker(val as boolean));

    return this.fridgeTempService;
  }

  protected onErdUpdate(erd: string, value: string): void {
    switch (erd) {
      case ErdFridge.FRESH_FOOD_TEMP.slice(2).toLowerCase():   // strip "0x"
      case ErdFridge.FRESH_FOOD_TEMP.toLowerCase():
        this.fridgeTempService
          .getCharacteristic(this.Characteristic.CurrentTemperature)
          .updateValue(this.getFridgeTemp());
        break;

      case ErdFridge.FREEZER_TEMP.slice(2).toLowerCase():
      case ErdFridge.FREEZER_TEMP.toLowerCase():
        this.freezerTempService
          .getCharacteristic(this.Characteristic.CurrentTemperature)
          .updateValue(this.getFreezerTemp());
        break;

      case ErdFridge.DOOR_STATUS.slice(2).toLowerCase():
      case ErdFridge.DOOR_STATUS.toLowerCase(): {
        const doors = decodeDoorStatus(value);
        this.fridgeDoorService
          .getCharacteristic(this.Characteristic.ContactSensorState)
          .updateValue(
            doors.fridge
              ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
              : this.Characteristic.ContactSensorState.CONTACT_DETECTED,
          );
        this.freezerDoorService
          .getCharacteristic(this.Characteristic.ContactSensorState)
          .updateValue(
            doors.freezer
              ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
              : this.Characteristic.ContactSensorState.CONTACT_DETECTED,
          );
        break;
      }

      case ErdFridge.ICE_MAKER_ENABLE_STATUS.slice(2).toLowerCase():
      case ErdFridge.ICE_MAKER_ENABLE_STATUS.toLowerCase():
        this.iceMakerService
          .getCharacteristic(this.Characteristic.On)
          .updateValue(hexToBool(value));
        break;
    }
  }

  // ── Getters / Setters ─────────────────────────────────────────────────────

  private getFridgeTemp(): number {
    const hex = this.getErd(ErdFridge.FRESH_FOOD_TEMP);
    const tempF = hexToInt(hex, 2);
    return fahrenheitToCelsius(tempF);
  }

  private getFreezerTemp(): number {
    const hex = this.getErd(ErdFridge.FREEZER_TEMP);
    const tempF = hexToInt(hex, 2);
    return fahrenheitToCelsius(tempF);
  }

  private getIceMaker(): boolean {
    return hexToBool(this.getErd(ErdFridge.ICE_MAKER_ENABLE_STATUS));
  }

  private async setIceMaker(enabled: boolean): Promise<void> {
    this.debugLog(`Set ice maker: ${enabled}`);
    await this.setErd(ErdFridge.ICE_MAKER_ENABLE_STATUS, boolToHex(enabled));
  }
}
