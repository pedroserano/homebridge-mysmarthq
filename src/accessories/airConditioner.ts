/**
 * Air Conditioner Accessory
 *
 * Exposes via HomeKit as a HeaterCooler service:
 *  - Active (on/off)
 *  - Current Temperature
 *  - Target Cooling Temperature
 *  - Fan Speed (rotation speed)
 *  - Mode (Cool/Fan/Heat → HomeKit COOL/AUTO/HEAT)
 *
 * ERD references:
 *  0x0100  AC_MODE         (ErdAcMode)
 *  0x0101  AC_STATUS       (0x00=off, 0x01=on)
 *  0x0103  FAN_SPEED       (ErdAcFanSpeed)
 *  0x0105  TARGET_TEMP     (1-byte °F, absolute)
 *  0x010A  CURRENT_TEMP    (1-byte °F, absolute)
 */

import { PlatformAccessory, Service } from 'homebridge';
import { BaseAccessory } from './baseAccessory';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
import { ErdAc, ErdAcMode, ErdAcFanSpeed } from '../api/erdCodes';
import {
  hexToUint,
  uintToHex,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  decodeAcTemp,
  encodeAcTemp,
} from '../utils/erdHelpers';

export class AirConditionerAccessory extends BaseAccessory {
  private acService!: Service;

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
    this.acService = (
      this.accessory.getService(this.Service.HeaterCooler) ??
      this.accessory.addService(this.Service.HeaterCooler, this.applianceInfo.nickname)
    );

    // Active (on/off)
    this.acService
      .getCharacteristic(this.Characteristic.Active)
      .onGet(() => this.getActive())
      .onSet(async (val) => this.setActive(val as number));

    // Current temperature
    this.acService
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .setProps({ minValue: 0, maxValue: 50 })
      .onGet(() => this.getCurrentTemp());

    // State (cool/heat/auto)
    this.acService
      .getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => this.getHeaterCoolerState());

    this.acService
      .getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [
          this.Characteristic.TargetHeaterCoolerState.AUTO,
          this.Characteristic.TargetHeaterCoolerState.COOL,
          this.Characteristic.TargetHeaterCoolerState.HEAT,
        ],
      })
      .onGet(() => this.getTargetState())
      .onSet(async (val) => this.setTargetState(val as number));

    // Cooling threshold temperature
    this.acService
      .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .setProps({ minValue: 16, maxValue: 32, minStep: 1 })  // 60–90°F range
      .onGet(() => this.getTargetTemp())
      .onSet(async (val) => this.setTargetTemp(val as number));

    // Fan speed (rotation speed %)
    this.acService
      .getCharacteristic(this.Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 33 })
      .onGet(() => this.getFanSpeedPercent())
      .onSet(async (val) => this.setFanSpeedPercent(val as number));

    return this.acService;
  }

  protected onErdUpdate(erd: string, value: string): void {
    switch (`0x${erd.replace('0x', '')}`) {
      case ErdAc.AC_STATUS:
        this.acService.getCharacteristic(this.Characteristic.Active)
          .updateValue(this.getActive());
        break;
      case ErdAc.CURRENT_TEMP:
        this.acService.getCharacteristic(this.Characteristic.CurrentTemperature)
          .updateValue(this.getCurrentTemp());
        break;
      case ErdAc.TARGET_TEMP:
        this.acService.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
          .updateValue(this.getTargetTemp());
        break;
      case ErdAc.AC_MODE:
        this.acService.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
          .updateValue(this.getTargetState());
        this.acService.getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
          .updateValue(this.getHeaterCoolerState());
        break;
      case ErdAc.FAN_SPEED:
        this.acService.getCharacteristic(this.Characteristic.RotationSpeed)
          .updateValue(this.getFanSpeedPercent());
        break;
    }
  }

  // ── Active ────────────────────────────────────────────────────────────────

  private getActive(): number {
    const hex = this.getErd(ErdAc.AC_STATUS);
    return hexToUint(hex) !== 0
      ? this.Characteristic.Active.ACTIVE
      : this.Characteristic.Active.INACTIVE;
  }

  private async setActive(val: number): Promise<void> {
    const on = val === this.Characteristic.Active.ACTIVE;
    this.debugLog(`Set AC active: ${on}`);
    await this.setErd(ErdAc.AC_STATUS, uintToHex(on ? 1 : 0));
  }

  // ── Temperature ───────────────────────────────────────────────────────────

  private getCurrentTemp(): number {
    const hex = this.getErd(ErdAc.CURRENT_TEMP);
    return fahrenheitToCelsius(decodeAcTemp(hex));
  }

  private getTargetTemp(): number {
    const hex = this.getErd(ErdAc.TARGET_TEMP);
    return fahrenheitToCelsius(decodeAcTemp(hex));
  }

  private async setTargetTemp(tempC: number): Promise<void> {
    const tempF = celsiusToFahrenheit(tempC);
    this.debugLog(`Set AC target temp: ${tempF}°F`);
    await this.setErd(ErdAc.TARGET_TEMP, encodeAcTemp(tempF));
  }

  // ── Mode ──────────────────────────────────────────────────────────────────

  private erdModeToHk(modeHex: string): number {
    switch (`0x${modeHex}`) {
      case ErdAcMode.COOL: return this.Characteristic.TargetHeaterCoolerState.COOL;
      case ErdAcMode.HEAT: return this.Characteristic.TargetHeaterCoolerState.HEAT;
      default:             return this.Characteristic.TargetHeaterCoolerState.AUTO;
    }
  }

  private getTargetState(): number {
    return this.erdModeToHk(this.getErd(ErdAc.AC_MODE));
  }

  private getHeaterCoolerState(): number {
    const mode = this.getErd(ErdAc.AC_MODE);
    const active = hexToUint(this.getErd(ErdAc.AC_STATUS)) !== 0;
    if (!active) return this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    switch (`0x${mode}`) {
      case ErdAcMode.COOL: return this.Characteristic.CurrentHeaterCoolerState.COOLING;
      case ErdAcMode.HEAT: return this.Characteristic.CurrentHeaterCoolerState.HEATING;
      default:             return this.Characteristic.CurrentHeaterCoolerState.IDLE;
    }
  }

  private async setTargetState(hkState: number): Promise<void> {
    let erdMode: string;
    if (hkState === this.Characteristic.TargetHeaterCoolerState.COOL) {
      erdMode = ErdAcMode.COOL.replace('0x', '');
    } else if (hkState === this.Characteristic.TargetHeaterCoolerState.HEAT) {
      erdMode = ErdAcMode.HEAT.replace('0x', '');
    } else {
      erdMode = ErdAcMode.FAN.replace('0x', '');
    }
    this.debugLog(`Set AC mode: ${erdMode}`);
    await this.setErd(ErdAc.AC_MODE, erdMode);
  }

  // ── Fan Speed ─────────────────────────────────────────────────────────────

  private getFanSpeedPercent(): number {
    const hex = this.getErd(ErdAc.FAN_SPEED);
    switch (`0x${hex}`) {
      case ErdAcFanSpeed.LOW:    return 33;
      case ErdAcFanSpeed.MEDIUM: return 66;
      case ErdAcFanSpeed.HIGH:   return 100;
      default:                   return 0;  // AUTO
    }
  }

  private async setFanSpeedPercent(percent: number): Promise<void> {
    let erdSpeed: string;
    if (percent <= 0) {
      erdSpeed = ErdAcFanSpeed.AUTO.replace('0x', '');
    } else if (percent <= 33) {
      erdSpeed = ErdAcFanSpeed.LOW.replace('0x', '');
    } else if (percent <= 66) {
      erdSpeed = ErdAcFanSpeed.MEDIUM.replace('0x', '');
    } else {
      erdSpeed = ErdAcFanSpeed.HIGH.replace('0x', '');
    }
    this.debugLog(`Set fan speed: ${percent}% → ${erdSpeed}`);
    await this.setErd(ErdAc.FAN_SPEED, erdSpeed);
  }
}
