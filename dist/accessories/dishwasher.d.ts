/**
 * Dishwasher Accessory
 *
 * Exposes via HomeKit:
 *  - Running state (Switch — read-only, shows cycle active)
 *  - Door contact sensor
 *  - Rinse aid low (MotionSensor — abused as a low-supply alert)
 *
 * ERD references:
 *  0xa000  CYCLE_STATE     (ErdDishwasherCycleState)
 *  0xa005  RINSE_AID_STATUS (0x00=OK, 0x01=low)
 *  0xa010  DOOR_STATUS      (0x00=closed, 0x01=open)
 *  0xa004  TIME_REMAINING   (2-byte minutes)
 */
import { PlatformAccessory, Service } from 'homebridge';
import { BaseAccessory } from './baseAccessory';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
export declare class DishwasherAccessory extends BaseAccessory {
    private cycleService;
    private doorService;
    private rinseAidService;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    protected setupServices(): Service;
    protected onErdUpdate(erd: string, value: string): void;
    private isRunning;
    private isRinseAidLow;
}
