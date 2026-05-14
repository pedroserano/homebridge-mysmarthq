"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefrigeratorAccessory = void 0;
const baseAccessory_1 = require("./baseAccessory");
const erdCodes_1 = require("../api/erdCodes");
const erdHelpers_1 = require("../utils/erdHelpers");
class RefrigeratorAccessory extends baseAccessory_1.BaseAccessory {
    constructor(platform, accessory, client, applianceInfo, refreshInterval) {
        super(platform, accessory, client, applianceInfo, refreshInterval);
    }
    setupServices() {
        // ── Fridge Temperature ──────────────────────────────────────────────────
        this.fridgeTempService = (this.accessory.getService('Fridge Temperature') ??
            this.accessory.addService(this.Service.TemperatureSensor, 'Fridge Temperature', 'fridge-temp'));
        this.fridgeTempService
            .getCharacteristic(this.Characteristic.CurrentTemperature)
            .onGet(() => this.getFridgeTemp());
        // ── Freezer Temperature ─────────────────────────────────────────────────
        this.freezerTempService = (this.accessory.getService('Freezer Temperature') ??
            this.accessory.addService(this.Service.TemperatureSensor, 'Freezer Temperature', 'freezer-temp'));
        this.freezerTempService
            .getCharacteristic(this.Characteristic.CurrentTemperature)
            .onGet(() => this.getFreezerTemp());
        // ── Fridge Door ─────────────────────────────────────────────────────────
        this.fridgeDoorService = (this.accessory.getService('Fridge Door') ??
            this.accessory.addService(this.Service.ContactSensor, 'Fridge Door', 'fridge-door'));
        // ── Freezer Door ────────────────────────────────────────────────────────
        this.freezerDoorService = (this.accessory.getService('Freezer Door') ??
            this.accessory.addService(this.Service.ContactSensor, 'Freezer Door', 'freezer-door'));
        // ── Ice Maker ───────────────────────────────────────────────────────────
        this.iceMakerService = (this.accessory.getService('Ice Maker') ??
            this.accessory.addService(this.Service.Switch, 'Ice Maker', 'ice-maker'));
        this.iceMakerService
            .getCharacteristic(this.Characteristic.On)
            .onGet(() => this.getIceMaker())
            .onSet(async (val) => this.setIceMaker(val));
        return this.fridgeTempService;
    }
    onErdUpdate(erd, value) {
        switch (erd) {
            case erdCodes_1.ErdFridge.FRESH_FOOD_TEMP.slice(2).toLowerCase(): // strip "0x"
            case erdCodes_1.ErdFridge.FRESH_FOOD_TEMP.toLowerCase():
                this.fridgeTempService
                    .getCharacteristic(this.Characteristic.CurrentTemperature)
                    .updateValue(this.getFridgeTemp());
                break;
            case erdCodes_1.ErdFridge.FREEZER_TEMP.slice(2).toLowerCase():
            case erdCodes_1.ErdFridge.FREEZER_TEMP.toLowerCase():
                this.freezerTempService
                    .getCharacteristic(this.Characteristic.CurrentTemperature)
                    .updateValue(this.getFreezerTemp());
                break;
            case erdCodes_1.ErdFridge.DOOR_STATUS.slice(2).toLowerCase():
            case erdCodes_1.ErdFridge.DOOR_STATUS.toLowerCase(): {
                const doors = (0, erdHelpers_1.decodeDoorStatus)(value);
                this.fridgeDoorService
                    .getCharacteristic(this.Characteristic.ContactSensorState)
                    .updateValue(doors.fridge
                    ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
                    : this.Characteristic.ContactSensorState.CONTACT_DETECTED);
                this.freezerDoorService
                    .getCharacteristic(this.Characteristic.ContactSensorState)
                    .updateValue(doors.freezer
                    ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
                    : this.Characteristic.ContactSensorState.CONTACT_DETECTED);
                break;
            }
            case erdCodes_1.ErdFridge.ICE_MAKER_ENABLE_STATUS.slice(2).toLowerCase():
            case erdCodes_1.ErdFridge.ICE_MAKER_ENABLE_STATUS.toLowerCase():
                this.iceMakerService
                    .getCharacteristic(this.Characteristic.On)
                    .updateValue((0, erdHelpers_1.hexToBool)(value));
                break;
        }
    }
    // ── Getters / Setters ─────────────────────────────────────────────────────
    getFridgeTemp() {
        const hex = this.getErd(erdCodes_1.ErdFridge.FRESH_FOOD_TEMP);
        const tempF = (0, erdHelpers_1.hexToInt)(hex, 2);
        return (0, erdHelpers_1.fahrenheitToCelsius)(tempF);
    }
    getFreezerTemp() {
        const hex = this.getErd(erdCodes_1.ErdFridge.FREEZER_TEMP);
        const tempF = (0, erdHelpers_1.hexToInt)(hex, 2);
        return (0, erdHelpers_1.fahrenheitToCelsius)(tempF);
    }
    getIceMaker() {
        return (0, erdHelpers_1.hexToBool)(this.getErd(erdCodes_1.ErdFridge.ICE_MAKER_ENABLE_STATUS));
    }
    async setIceMaker(enabled) {
        this.debugLog(`Set ice maker: ${enabled}`);
        await this.setErd(erdCodes_1.ErdFridge.ICE_MAKER_ENABLE_STATUS, (0, erdHelpers_1.boolToHex)(enabled));
    }
}
exports.RefrigeratorAccessory = RefrigeratorAccessory;
