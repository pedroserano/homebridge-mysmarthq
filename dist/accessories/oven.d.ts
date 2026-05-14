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
export declare class OvenAccessory extends BaseAccessory {
    private upperTempService;
    private upperSwitchService;
    private lowerTempService;
    private lowerSwitchService;
    private hasLowerOven;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    protected setupServices(): Service;
    protected onErdUpdate(erd: string, value: string): void;
    private getUpperTemp;
    private getUpperActive;
    private getLowerTemp;
    private getLowerActive;
}
