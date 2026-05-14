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
import { ErdDishwasher, ErdDishwasherCycleState } from '../api/erdCodes';
import { hexToUint } from '../utils/erdHelpers';

const IDLE_STATES = new Set<string>([
  ErdDishwasherCycleState.NONE,
  ErdDishwasherCycleState.CLEAN,
]);

export class DishwasherAccessory extends BaseAccessory {
  private cycleService!: Service;
  private doorService!: Service;
  private rinseAidService!: Service;

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
    // ── Cycle active switch (read-only) ──────────────────────────────────────
    this.cycleService = (
      this.accessory.getService('Dishwasher') ??
      this.accessory.addService(this.Service.Switch, 'Dishwasher', 'dishwasher-cycle')
    );
    this.cycleService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.isRunning())
      .onSet(async () => {
        // Read-only: push state back immediately
        setTimeout(() => {
          this.cycleService
            .getCharacteristic(this.Characteristic.On)
            .updateValue(this.isRunning());
        }, 300);
      });

    // ── Door sensor ──────────────────────────────────────────────────────────
    this.doorService = (
      this.accessory.getService('Dishwasher Door') ??
      this.accessory.addService(this.Service.ContactSensor, 'Dishwasher Door', 'dishwasher-door')
    );

    // ── Rinse aid level ──────────────────────────────────────────────────────
    // Using OccupancySensor as a "supply low" alert (no native HomeKit service for this)
    this.rinseAidService = (
      this.accessory.getService('Rinse Aid Low') ??
      this.accessory.addService(this.Service.OccupancySensor, 'Rinse Aid Low', 'dishwasher-rinse-aid')
    );
    this.rinseAidService
      .getCharacteristic(this.Characteristic.OccupancyDetected)
      .onGet(() => this.isRinseAidLow()
        ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
        : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
      );

    return this.cycleService;
  }

  protected onErdUpdate(erd: string, value: string): void {
    const erdLower = erd.replace('0x', '');

    switch (`0x${erdLower}`) {
      case ErdDishwasher.CYCLE_STATE:
        this.cycleService
          .getCharacteristic(this.Characteristic.On)
          .updateValue(this.isRunning());
        break;

      case ErdDishwasher.DOOR_STATUS:
        this.doorService
          .getCharacteristic(this.Characteristic.ContactSensorState)
          .updateValue(
            hexToUint(value) === 1
              ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
              : this.Characteristic.ContactSensorState.CONTACT_DETECTED,
          );
        break;

      case ErdDishwasher.RINSE_AID_STATUS:
        this.rinseAidService
          .getCharacteristic(this.Characteristic.OccupancyDetected)
          .updateValue(
            this.isRinseAidLow()
              ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
              : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
          );
        break;
    }
  }

  private isRunning(): boolean {
    const hex = this.getErd(ErdDishwasher.CYCLE_STATE);
    const state = `0x${hex.padStart(2, '0')}`;
    return !IDLE_STATES.has(state);
  }

  private isRinseAidLow(): boolean {
    const hex = this.getErd(ErdDishwasher.RINSE_AID_STATUS);
    return hexToUint(hex) !== 0;
  }
}
