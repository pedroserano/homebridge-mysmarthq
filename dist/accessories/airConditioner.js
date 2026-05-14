"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirConditionerAccessory = void 0;
const baseAccessory_1 = require("./baseAccessory");
const erdCodes_1 = require("../api/erdCodes");
const erdHelpers_1 = require("../utils/erdHelpers");
class AirConditionerAccessory extends baseAccessory_1.BaseAccessory {
    constructor(platform, accessory, client, applianceInfo, refreshInterval) {
        super(platform, accessory, client, applianceInfo, refreshInterval);
    }
    setupServices() {
        this.acService = (this.accessory.getService(this.Service.HeaterCooler) ??
            this.accessory.addService(this.Service.HeaterCooler, this.applianceInfo.nickname));
        // Active (on/off)
        this.acService
            .getCharacteristic(this.Characteristic.Active)
            .onGet(() => this.getActive())
            .onSet(async (val) => this.setActive(val));
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
            .onSet(async (val) => this.setTargetState(val));
        // Cooling threshold temperature
        this.acService
            .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
            .setProps({ minValue: 16, maxValue: 32, minStep: 1 }) // 60–90°F range
            .onGet(() => this.getTargetTemp())
            .onSet(async (val) => this.setTargetTemp(val));
        // Fan speed (rotation speed %)
        this.acService
            .getCharacteristic(this.Characteristic.RotationSpeed)
            .setProps({ minValue: 0, maxValue: 100, minStep: 33 })
            .onGet(() => this.getFanSpeedPercent())
            .onSet(async (val) => this.setFanSpeedPercent(val));
        return this.acService;
    }
    onErdUpdate(erd, value) {
        switch (`0x${erd.replace('0x', '')}`) {
            case erdCodes_1.ErdAc.AC_STATUS:
                this.acService.getCharacteristic(this.Characteristic.Active)
                    .updateValue(this.getActive());
                break;
            case erdCodes_1.ErdAc.CURRENT_TEMP:
                this.acService.getCharacteristic(this.Characteristic.CurrentTemperature)
                    .updateValue(this.getCurrentTemp());
                break;
            case erdCodes_1.ErdAc.TARGET_TEMP:
                this.acService.getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
                    .updateValue(this.getTargetTemp());
                break;
            case erdCodes_1.ErdAc.AC_MODE:
                this.acService.getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
                    .updateValue(this.getTargetState());
                this.acService.getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
                    .updateValue(this.getHeaterCoolerState());
                break;
            case erdCodes_1.ErdAc.FAN_SPEED:
                this.acService.getCharacteristic(this.Characteristic.RotationSpeed)
                    .updateValue(this.getFanSpeedPercent());
                break;
        }
    }
    // ── Active ────────────────────────────────────────────────────────────────
    getActive() {
        const hex = this.getErd(erdCodes_1.ErdAc.AC_STATUS);
        return (0, erdHelpers_1.hexToUint)(hex) !== 0
            ? this.Characteristic.Active.ACTIVE
            : this.Characteristic.Active.INACTIVE;
    }
    async setActive(val) {
        const on = val === this.Characteristic.Active.ACTIVE;
        this.debugLog(`Set AC active: ${on}`);
        await this.setErd(erdCodes_1.ErdAc.AC_STATUS, (0, erdHelpers_1.uintToHex)(on ? 1 : 0));
    }
    // ── Temperature ───────────────────────────────────────────────────────────
    getCurrentTemp() {
        const hex = this.getErd(erdCodes_1.ErdAc.CURRENT_TEMP);
        return (0, erdHelpers_1.fahrenheitToCelsius)((0, erdHelpers_1.decodeAcTemp)(hex));
    }
    getTargetTemp() {
        const hex = this.getErd(erdCodes_1.ErdAc.TARGET_TEMP);
        return (0, erdHelpers_1.fahrenheitToCelsius)((0, erdHelpers_1.decodeAcTemp)(hex));
    }
    async setTargetTemp(tempC) {
        const tempF = (0, erdHelpers_1.celsiusToFahrenheit)(tempC);
        this.debugLog(`Set AC target temp: ${tempF}°F`);
        await this.setErd(erdCodes_1.ErdAc.TARGET_TEMP, (0, erdHelpers_1.encodeAcTemp)(tempF));
    }
    // ── Mode ──────────────────────────────────────────────────────────────────
    erdModeToHk(modeHex) {
        switch (`0x${modeHex}`) {
            case erdCodes_1.ErdAcMode.COOL: return this.Characteristic.TargetHeaterCoolerState.COOL;
            case erdCodes_1.ErdAcMode.HEAT: return this.Characteristic.TargetHeaterCoolerState.HEAT;
            default: return this.Characteristic.TargetHeaterCoolerState.AUTO;
        }
    }
    getTargetState() {
        return this.erdModeToHk(this.getErd(erdCodes_1.ErdAc.AC_MODE));
    }
    getHeaterCoolerState() {
        const mode = this.getErd(erdCodes_1.ErdAc.AC_MODE);
        const active = (0, erdHelpers_1.hexToUint)(this.getErd(erdCodes_1.ErdAc.AC_STATUS)) !== 0;
        if (!active)
            return this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
        switch (`0x${mode}`) {
            case erdCodes_1.ErdAcMode.COOL: return this.Characteristic.CurrentHeaterCoolerState.COOLING;
            case erdCodes_1.ErdAcMode.HEAT: return this.Characteristic.CurrentHeaterCoolerState.HEATING;
            default: return this.Characteristic.CurrentHeaterCoolerState.IDLE;
        }
    }
    async setTargetState(hkState) {
        let erdMode;
        if (hkState === this.Characteristic.TargetHeaterCoolerState.COOL) {
            erdMode = erdCodes_1.ErdAcMode.COOL.replace('0x', '');
        }
        else if (hkState === this.Characteristic.TargetHeaterCoolerState.HEAT) {
            erdMode = erdCodes_1.ErdAcMode.HEAT.replace('0x', '');
        }
        else {
            erdMode = erdCodes_1.ErdAcMode.FAN.replace('0x', '');
        }
        this.debugLog(`Set AC mode: ${erdMode}`);
        await this.setErd(erdCodes_1.ErdAc.AC_MODE, erdMode);
    }
    // ── Fan Speed ─────────────────────────────────────────────────────────────
    getFanSpeedPercent() {
        const hex = this.getErd(erdCodes_1.ErdAc.FAN_SPEED);
        switch (`0x${hex}`) {
            case erdCodes_1.ErdAcFanSpeed.LOW: return 33;
            case erdCodes_1.ErdAcFanSpeed.MEDIUM: return 66;
            case erdCodes_1.ErdAcFanSpeed.HIGH: return 100;
            default: return 0; // AUTO
        }
    }
    async setFanSpeedPercent(percent) {
        let erdSpeed;
        if (percent <= 0) {
            erdSpeed = erdCodes_1.ErdAcFanSpeed.AUTO.replace('0x', '');
        }
        else if (percent <= 33) {
            erdSpeed = erdCodes_1.ErdAcFanSpeed.LOW.replace('0x', '');
        }
        else if (percent <= 66) {
            erdSpeed = erdCodes_1.ErdAcFanSpeed.MEDIUM.replace('0x', '');
        }
        else {
            erdSpeed = erdCodes_1.ErdAcFanSpeed.HIGH.replace('0x', '');
        }
        this.debugLog(`Set fan speed: ${percent}% → ${erdSpeed}`);
        await this.setErd(erdCodes_1.ErdAc.FAN_SPEED, erdSpeed);
    }
}
exports.AirConditionerAccessory = AirConditionerAccessory;
