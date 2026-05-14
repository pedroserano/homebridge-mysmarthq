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
export declare class RefrigeratorAccessory extends BaseAccessory {
    private fridgeTempService;
    private freezerTempService;
    private fridgeDoorService;
    private freezerDoorService;
    private iceMakerService;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    protected setupServices(): Service;
    protected onErdUpdate(erd: string, value: string): void;
    private getFridgeTemp;
    private getFreezerTemp;
    private getIceMaker;
    private setIceMaker;
}
