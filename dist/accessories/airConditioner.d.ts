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
export declare class AirConditionerAccessory extends BaseAccessory {
    private acService;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    protected setupServices(): Service;
    protected onErdUpdate(erd: string, value: string): void;
    private getActive;
    private setActive;
    private getCurrentTemp;
    private getTargetTemp;
    private setTargetTemp;
    private erdModeToHk;
    private getTargetState;
    private getHeaterCoolerState;
    private setTargetState;
    private getFanSpeedPercent;
    private setFanSpeedPercent;
}
