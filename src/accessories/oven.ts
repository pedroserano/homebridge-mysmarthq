/**
 * Oven / Range Accessory
 *
 * Exposes via HomeKit:
 *  - Upper oven current temperature (TemperatureSensor)
 *  - Upper oven active state (Switch — on = oven is operating)
 *  - Lower oven current temperature (TemperatureSensor, if double oven)
 *  - Lower oven active state (Switch)
 *  - Oven state description (derived from ErdOvenState → StatusActive + Name)
 *
 * For safety, this plugin does NOT expose remote cook-mode controls.
 * It exposes monitoring and a "turn off" capability only.
 *
 * ERD references:
 *  0x5120  UPPER_OVEN_COOK_MODE
 *  0x5124  UPPER_OVEN_CURRENT_STATE
 *  0x5126  UPPER_OVEN_CURRENT_TEMP  (signed 16-bit °F)
 *  0x5200  LOWER_OVEN_COOK_MODE
 *  0x5204  LOWER_OVEN_CURRENT_STATE
 *  0x5206  LOWER_OVEN_CURRENT_TEMP  (signed 16-bit °F)
 *  0x5110  OVEN_CONFIGURATION       (bitmask — bit0 = has lower oven)
 */

import { PlatformAccessory, Service } from 'homebridge';
import { BaseAccessory } from './baseAccessory';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
import { ErdOven, ErdOvenState } from '../api/erdCodes';
import {
  hexToInt,
  hexToUint,
  fahrenheitToCelsius,
  getBit,
} from '../utils/erdHelpers';

// ERD codes with the "0x" stripped, lowercase — matches what the WS delivers
const ERD_UPPER_STATE = '5124';
const ERD_UPPER_TEMP  = '5126';
const ERD_LOWER_STATE = '5204';
const ERD_LOWER_TEMP  = '5206';
const ERD_OVEN_CONFIG = '5110';

const OVEN_OFF_STATES = new Set([ErdOvenState.NO_OPERATION]);

function isOvenActive(stateHex: string): boolean {
  const state = `0x${stateHex}`;
  return !OVEN_OFF_STATES.has(state as ErdOvenState);
}

export class OvenAccessory extends BaseAccessory {
  private upperTempService!: Service;
  private upperSwitchService!: Service;
  private lowerTempService: Service | null = null;
  private lowerSwitchService: Service | null = null;
  private hasLowerOven = false;

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
    // Check oven configuration to see if it's a double oven
    const configHex = this.getErd(ErdOven.OVEN_CONFIGURATION);
    this.hasLowerOven = configHex ? getBit(configHex, 0) : false;

    // ── Upper oven temperature ───────────────────────────────────────────────
    this.upperTempService = (
      this.accessory.getService('Upper Oven Temperature') ??
      this.accessory.addService(this.Service.TemperatureSensor, 'Upper Oven Temperature', 'upper-oven-temp')
    );
    this.upperTempService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({ minValue: -20, maxValue: 290 })  // ~0–550°F
      .onGet(() => this.getUpperTemp());

    // ── Upper oven active state (read-only switch — on = oven is on) ─────────
    this.upperSwitchService = (
      this.accessory.getService('Upper Oven') ??
      this.accessory.addService(this.Service.Switch, 'Upper Oven', 'upper-oven-switch')
    );
    this.upperSwitchService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.getUpperActive())
      .onSet(async (val) => {
        // Only allow turning OFF — never allow remote ignition
        if (!val) {
          this.debugLog('Turning upper oven off via remote');
          await this.setErd(ErdOven.UPPER_OVEN_COOK_MODE, '0000000000');
        } else {
          // Push back the current state so HomeKit reverts the switch
          setTimeout(() => {
            this.upperSwitchService
              .getCharacteristic(this.Characteristic.On)
              .updateValue(false);
          }, 500);
        }
      });

    // ── Lower oven (double oven only) ────────────────────────────────────────
    if (this.hasLowerOven) {
      this.lowerTempService = (
        this.accessory.getService('Lower Oven Temperature') ??
        this.accessory.addService(this.Service.TemperatureSensor, 'Lower Oven Temperature', 'lower-oven-temp')
      );
      this.lowerTempService
        .getCharacteristic(this.Characteristic.CurrentTemperature)
        .setProps({ minValue: -20, maxValue: 290 })
        .onGet(() => this.getLowerTemp());

      this.lowerSwitchService = (
        this.accessory.getService('Lower Oven') ??
        this.accessory.addService(this.Service.Switch, 'Lower Oven', 'lower-oven-switch')
      );
      this.lowerSwitchService
        .getCharacteristic(this.Characteristic.On)
        .onGet(() => this.getLowerActive())
        .onSet(async (val) => {
          if (!val) {
            await this.setErd(ErdOven.LOWER_OVEN_COOK_MODE, '0000000000');
          } else {
            setTimeout(() => {
              this.lowerSwitchService!
                .getCharacteristic(this.Characteristic.On)
                .updateValue(false);
            }, 500);
          }
        });
    }

    return this.upperTempService;
  }

  protected onErdUpdate(erd: string, value: string): void {
    switch (erd) {
      case ERD_UPPER_TEMP:
        this.upperTempService
          .getCharacteristic(this.Characteristic.CurrentTemperature)
          .updateValue(this.getUpperTemp());
        break;

      case ERD_UPPER_STATE:
        this.upperSwitchService
          .getCharacteristic(this.Characteristic.On)
          .updateValue(isOvenActive(value));
        break;

      case ERD_LOWER_TEMP:
        this.lowerTempService
          ?.getCharacteristic(this.Characteristic.CurrentTemperature)
          .updateValue(this.getLowerTemp());
        break;

      case ERD_LOWER_STATE:
        this.lowerSwitchService
          ?.getCharacteristic(this.Characteristic.On)
          .updateValue(isOvenActive(value));
        break;

      case ERD_OVEN_CONFIG:
        this.hasLowerOven = getBit(value, 0);
        break;
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  private getUpperTemp(): number {
    const hex = this.getErd(ErdOven.UPPER_OVEN_CURRENT_TEMP);
    return fahrenheitToCelsius(hexToInt(hex, 2));
  }

  private getUpperActive(): boolean {
    const hex = this.getErd(ErdOven.UPPER_OVEN_CURRENT_STATE);
    return isOvenActive(hex);
  }

  private getLowerTemp(): number {
    const hex = this.getErd(ErdOven.LOWER_OVEN_CURRENT_TEMP);
    return fahrenheitToCelsius(hexToInt(hex, 2));
  }

  private getLowerActive(): boolean {
    const hex = this.getErd(ErdOven.LOWER_OVEN_CURRENT_STATE);
    return isOvenActive(hex);
  }
}
