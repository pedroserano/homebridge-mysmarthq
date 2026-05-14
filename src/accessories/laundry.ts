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
import { ErdApplianceType, ErdLaundry, ErdLaundryCycleState } from '../api/erdCodes';
import { hexToUint } from '../utils/erdHelpers';

const IDLE_STATES = new Set<string>([
  ErdLaundryCycleState.NONE,
  ErdLaundryCycleState.COMPLETE,
  ErdLaundryCycleState.POWER_OFF,
]);

export class LaundryAccessory extends BaseAccessory {
  private cycleService!: Service;
  private doorService!: Service;
  private lockService: Service | null = null;
  private readonly isWasher: boolean;

  constructor(
    platform: SmartHQPlatform,
    accessory: PlatformAccessory,
    client: SmartHQClient,
    applianceInfo: ApplianceInfo,
    refreshInterval: number,
  ) {
    // Determine washer vs dryer from appliance type
    const type = applianceInfo.applianceType?.toLowerCase() ?? '';
    const washerHex = ErdApplianceType.WASHER.replace('0x', '').toLowerCase();
    // Set field before super so setupServices() can use it
    (applianceInfo as ApplianceInfo & { _isWasher: boolean })._isWasher =
      type === washerHex || type === ErdApplianceType.WASHER.toLowerCase();
    super(platform, accessory, client, applianceInfo, refreshInterval);
    this.isWasher = (applianceInfo as ApplianceInfo & { _isWasher: boolean })._isWasher;
  }

  protected setupServices(): Service {
    const label = (this.applianceInfo as ApplianceInfo & { _isWasher: boolean })._isWasher
      ? 'Washer'
      : 'Dryer';

    // ── Cycle active ────────────────────────────────────────────────────────
    this.cycleService = (
      this.accessory.getService(label) ??
      this.accessory.addService(this.Service.Switch, label, `${label.toLowerCase()}-cycle`)
    );
    this.cycleService
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.isRunning())
      .onSet(async () => {
        setTimeout(() => {
          this.cycleService
            .getCharacteristic(this.Characteristic.On)
            .updateValue(this.isRunning());
        }, 300);
      });

    // ── Door sensor ─────────────────────────────────────────────────────────
    this.doorService = (
      this.accessory.getService(`${label} Door`) ??
      this.accessory.addService(this.Service.ContactSensor, `${label} Door`, `${label.toLowerCase()}-door`)
    );

    // ── Door lock (washer only) ─────────────────────────────────────────────
    if ((this.applianceInfo as ApplianceInfo & { _isWasher: boolean })._isWasher) {
      this.lockService = (
        this.accessory.getService('Washer Door Lock') ??
        this.accessory.addService(this.Service.LockMechanism, 'Washer Door Lock', 'washer-lock')
      );
      this.lockService
        .getCharacteristic(this.Characteristic.LockCurrentState)
        .onGet(() => this.getLockState());
      this.lockService
        .getCharacteristic(this.Characteristic.LockTargetState)
        .onGet(() => this.getLockState())
        .onSet(async () => {
          // Door lock is hardware-controlled; ignore remote set attempts
          setTimeout(() => {
            this.lockService!
              .getCharacteristic(this.Characteristic.LockTargetState)
              .updateValue(this.getLockState());
          }, 300);
        });
    }

    return this.cycleService;
  }

  protected onErdUpdate(erd: string, value: string): void {
    const normalized = erd.startsWith('0x') ? erd : `0x${erd}`;

    switch (normalized) {
      case ErdLaundry.CYCLE_STATE:
        this.cycleService
          .getCharacteristic(this.Characteristic.On)
          .updateValue(this.isRunning());
        break;

      case ErdLaundry.DOOR_STATUS:
        this.doorService
          .getCharacteristic(this.Characteristic.ContactSensorState)
          .updateValue(
            hexToUint(value) !== 0
              ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
              : this.Characteristic.ContactSensorState.CONTACT_DETECTED,
          );
        break;

      case ErdLaundry.DOOR_LOCK:
        this.lockService
          ?.getCharacteristic(this.Characteristic.LockCurrentState)
          .updateValue(this.getLockState());
        this.lockService
          ?.getCharacteristic(this.Characteristic.LockTargetState)
          .updateValue(this.getLockState());
        break;
    }
  }

  private isRunning(): boolean {
    const hex = this.getErd(ErdLaundry.CYCLE_STATE);
    const state = `0x${hex.padStart(2, '0')}`;
    return !IDLE_STATES.has(state);
  }

  private getLockState(): number {
    const hex = this.getErd(ErdLaundry.DOOR_LOCK);
    return hexToUint(hex) !== 0
      ? this.Characteristic.LockCurrentState.SECURED
      : this.Characteristic.LockCurrentState.UNSECURED;
  }
}
