/**
 * Laundry Accessory (Washer or Dryer)
 *
 * Exposes via HomeKit:
 *  - Cycle active (Switch — read-only)
 *  - Door status (ContactSensor)
 *  - Door lock (LockMechanism — washer only)
 *
 * ERD references:
 *  0x2000  CYCLE_STATE          (ErdLaundryCycleState)
 *  0x2001  TIME_REMAINING       (3-byte HHMMSS)
 *  0x2003  DOOR_LOCK            (0x00=unlocked, 0x01=locked)
 *  0x2005  DOOR_STATUS          (0x00=closed, 0x01=open)
 *  0x2019  DRYER_TUMBLE_STATUS  (bool)
 */
import { PlatformAccessory, Service } from 'homebridge';
import { BaseAccessory } from './baseAccessory';
import { SmartHQPlatform } from '../platform';
import { SmartHQClient } from '../api/wsClient';
import { ApplianceInfo } from '../api/authClient';
export declare class LaundryAccessory extends BaseAccessory {
    private cycleService;
    private doorService;
    private lockService;
    private readonly isWasher;
    constructor(platform: SmartHQPlatform, accessory: PlatformAccessory, client: SmartHQClient, applianceInfo: ApplianceInfo, refreshInterval: number);
    protected setupServices(): Service;
    protected onErdUpdate(erd: string, value: string): void;
    private isRunning;
    private getLockState;
}
