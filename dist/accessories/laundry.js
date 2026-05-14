"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaundryAccessory = void 0;
const baseAccessory_1 = require("./baseAccessory");
const erdCodes_1 = require("../api/erdCodes");
const erdHelpers_1 = require("../utils/erdHelpers");
const IDLE_STATES = new Set([
    erdCodes_1.ErdLaundryCycleState.NONE,
    erdCodes_1.ErdLaundryCycleState.COMPLETE,
    erdCodes_1.ErdLaundryCycleState.POWER_OFF,
]);
class LaundryAccessory extends baseAccessory_1.BaseAccessory {
    constructor(platform, accessory, client, applianceInfo, refreshInterval) {
        // Determine washer vs dryer from appliance type
        const type = applianceInfo.applianceType?.toLowerCase() ?? '';
        const washerHex = erdCodes_1.ErdApplianceType.WASHER.replace('0x', '').toLowerCase();
        // Set field before super so setupServices() can use it
        applianceInfo._isWasher =
            type === washerHex || type === erdCodes_1.ErdApplianceType.WASHER.toLowerCase();
        super(platform, accessory, client, applianceInfo, refreshInterval);
        this.lockService = null;
        this.isWasher = applianceInfo._isWasher;
    }
    setupServices() {
        const label = this.applianceInfo._isWasher
            ? 'Washer'
            : 'Dryer';
        // ── Cycle active ────────────────────────────────────────────────────────
        this.cycleService = (this.accessory.getService(label) ??
            this.accessory.addService(this.Service.Switch, label, `${label.toLowerCase()}-cycle`));
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
        this.doorService = (this.accessory.getService(`${label} Door`) ??
            this.accessory.addService(this.Service.ContactSensor, `${label} Door`, `${label.toLowerCase()}-door`));
        // ── Door lock (washer only) ─────────────────────────────────────────────
        if (this.applianceInfo._isWasher) {
            this.lockService = (this.accessory.getService('Washer Door Lock') ??
                this.accessory.addService(this.Service.LockMechanism, 'Washer Door Lock', 'washer-lock'));
            this.lockService
                .getCharacteristic(this.Characteristic.LockCurrentState)
                .onGet(() => this.getLockState());
            this.lockService
                .getCharacteristic(this.Characteristic.LockTargetState)
                .onGet(() => this.getLockState())
                .onSet(async () => {
                // Door lock is hardware-controlled; ignore remote set attempts
                setTimeout(() => {
                    this.lockService
                        .getCharacteristic(this.Characteristic.LockTargetState)
                        .updateValue(this.getLockState());
                }, 300);
            });
        }
        return this.cycleService;
    }
    onErdUpdate(erd, value) {
        const normalized = erd.startsWith('0x') ? erd : `0x${erd}`;
        switch (normalized) {
            case erdCodes_1.ErdLaundry.CYCLE_STATE:
                this.cycleService
                    .getCharacteristic(this.Characteristic.On)
                    .updateValue(this.isRunning());
                break;
            case erdCodes_1.ErdLaundry.DOOR_STATUS:
                this.doorService
                    .getCharacteristic(this.Characteristic.ContactSensorState)
                    .updateValue((0, erdHelpers_1.hexToUint)(value) !== 0
                    ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
                    : this.Characteristic.ContactSensorState.CONTACT_DETECTED);
                break;
            case erdCodes_1.ErdLaundry.DOOR_LOCK:
                this.lockService
                    ?.getCharacteristic(this.Characteristic.LockCurrentState)
                    .updateValue(this.getLockState());
                this.lockService
                    ?.getCharacteristic(this.Characteristic.LockTargetState)
                    .updateValue(this.getLockState());
                break;
        }
    }
    isRunning() {
        const hex = this.getErd(erdCodes_1.ErdLaundry.CYCLE_STATE);
        const state = `0x${hex.padStart(2, '0')}`;
        return !IDLE_STATES.has(state);
    }
    getLockState() {
        const hex = this.getErd(erdCodes_1.ErdLaundry.DOOR_LOCK);
        return (0, erdHelpers_1.hexToUint)(hex) !== 0
            ? this.Characteristic.LockCurrentState.SECURED
            : this.Characteristic.LockCurrentState.UNSECURED;
    }
}
exports.LaundryAccessory = LaundryAccessory;
