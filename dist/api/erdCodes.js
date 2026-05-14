"use strict";
/**
 * ERD (Extended Resource Descriptor) Code Definitions
 *
 * GE SmartHQ communicates device state via hex property codes called ERDs.
 * Values are sent as hex strings (no leading "0x"), JSON-encoded in a dict.
 *
 * Source: gehomesdk + GEMaker reverse-engineering repos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErdWaterHeater = exports.ErdAcFanSpeed = exports.ErdAcMode = exports.ErdAc = exports.ErdLaundryCycleState = exports.ErdLaundry = exports.ErdDishwasherCycleState = exports.ErdDishwasher = exports.ErdOvenState = exports.ErdOven = exports.ErdFridge = exports.ErdApplianceType = exports.ErdCommon = void 0;
// ─── Common / Universal ───────────────────────────────────────────────────────
var ErdCommon;
(function (ErdCommon) {
    ErdCommon["APPLIANCE_TYPE"] = "0x0008";
    ErdCommon["MODEL_NUMBER"] = "0x0001";
    ErdCommon["SERIAL_NUMBER"] = "0x0002";
    ErdCommon["WIFI_MODULE_SW_VERSION"] = "0x0100";
    ErdCommon["WIFI_MODULE_HW_VERSION"] = "0x0101";
    ErdCommon["CLOCK_FORMAT"] = "0x0006";
    ErdCommon["TEMPERATURE_UNIT"] = "0x0007";
    ErdCommon["ACK"] = "0x0012";
    ErdCommon["SABBATH_MODE"] = "0x0009";
    ErdCommon["USER_INTERFACE_LOCKED"] = "0x000A";
    ErdCommon["SOUND_LEVEL"] = "0x000D";
    ErdCommon["REMOTE_ENABLE"] = "0x000F";
})(ErdCommon || (exports.ErdCommon = ErdCommon = {}));
// ─── Appliance Type Values ────────────────────────────────────────────────────
var ErdApplianceType;
(function (ErdApplianceType) {
    ErdApplianceType["UNKNOWN"] = "0x00";
    ErdApplianceType["REFRIGERATOR"] = "0x01";
    ErdApplianceType["RANGE"] = "0x02";
    ErdApplianceType["MICROWAVE"] = "0x07";
    ErdApplianceType["DISHWASHER"] = "0x08";
    ErdApplianceType["WASHER"] = "0x0a";
    ErdApplianceType["DRYER"] = "0x0b";
    ErdApplianceType["AIR_CONDITIONER"] = "0x0e";
    ErdApplianceType["WATER_HEATER"] = "0x1b";
    ErdApplianceType["ADVANTIUM"] = "0x21";
    ErdApplianceType["ESPRESSO_MAKER"] = "0x28";
    ErdApplianceType["COFFEE_MAKER"] = "0x29";
    ErdApplianceType["ICE_MAKER"] = "0x2a";
    ErdApplianceType["HOOD"] = "0x43";
    ErdApplianceType["WATER_SOFTENER"] = "0x52";
    ErdApplianceType["WATER_FILTER"] = "0x53";
    ErdApplianceType["BEVERAGE_CENTER"] = "0x62";
})(ErdApplianceType || (exports.ErdApplianceType = ErdApplianceType = {}));
// ─── Refrigerator ─────────────────────────────────────────────────────────────
var ErdFridge;
(function (ErdFridge) {
    ErdFridge["CURRENT_TEMPERATURE"] = "0x1004";
    ErdFridge["TARGET_TEMPERATURE"] = "0x1005";
    ErdFridge["DOOR_STATUS"] = "0x1007";
    ErdFridge["HOT_WATER_STATUS"] = "0x1009";
    ErdFridge["FRESH_FOOD_TARGET_TEMP"] = "0x1006";
    ErdFridge["FREEZER_TARGET_TEMP"] = "0x100a";
    ErdFridge["FRESH_FOOD_TEMP"] = "0x1004";
    ErdFridge["FREEZER_TEMP"] = "0x1003";
    ErdFridge["ICE_MAKER_ENABLE_STATUS"] = "0x1013";
    ErdFridge["ICE_MAKER_BUCKET_STATUS"] = "0x1011";
    ErdFridge["HOT_WATER_SET_TEMP"] = "0x1008";
    ErdFridge["FILTER_STATUS"] = "0x1009";
})(ErdFridge || (exports.ErdFridge = ErdFridge = {}));
// ─── Oven / Range ─────────────────────────────────────────────────────────────
var ErdOven;
(function (ErdOven) {
    ErdOven["UPPER_OVEN_COOK_MODE"] = "0x5120";
    ErdOven["UPPER_OVEN_CURRENT_STATE"] = "0x5124";
    ErdOven["UPPER_OVEN_PROBE_PRESENT"] = "0x5123";
    ErdOven["UPPER_OVEN_PROBE_TEMP"] = "0x5125";
    ErdOven["UPPER_OVEN_CURRENT_TEMP"] = "0x5126";
    ErdOven["UPPER_OVEN_TARGET_TEMP"] = "0x5121";
    ErdOven["UPPER_OVEN_KITCHEN_TIMER"] = "0x5127";
    ErdOven["UPPER_OVEN_ELAPSED_TIME"] = "0x5128";
    ErdOven["UPPER_OVEN_DISPLAY_TEMP"] = "0x5129";
    ErdOven["LOWER_OVEN_COOK_MODE"] = "0x5200";
    ErdOven["LOWER_OVEN_CURRENT_STATE"] = "0x5204";
    ErdOven["LOWER_OVEN_PROBE_PRESENT"] = "0x5203";
    ErdOven["LOWER_OVEN_PROBE_TEMP"] = "0x5205";
    ErdOven["LOWER_OVEN_CURRENT_TEMP"] = "0x5206";
    ErdOven["LOWER_OVEN_TARGET_TEMP"] = "0x5201";
    ErdOven["LOWER_OVEN_KITCHEN_TIMER"] = "0x5205";
    ErdOven["LOWER_OVEN_ELAPSED_TIME"] = "0x5208";
    ErdOven["LOWER_OVEN_DISPLAY_TEMP"] = "0x5209";
    ErdOven["OVEN_CONFIGURATION"] = "0x5110";
    ErdOven["CONVECTION_CONVERSION"] = "0x5111";
    ErdOven["AVAILABLE_COOK_MODES"] = "0x5112";
    ErdOven["PREHEAT_DURATION"] = "0x5113";
})(ErdOven || (exports.ErdOven = ErdOven = {}));
// Oven state codes (value of UPPER/LOWER_OVEN_CURRENT_STATE)
var ErdOvenState;
(function (ErdOvenState) {
    ErdOvenState["NO_OPERATION"] = "0x00";
    ErdOvenState["PREHEATING"] = "0x01";
    ErdOvenState["BAKING"] = "0x02";
    ErdOvenState["BROILING"] = "0x03";
    ErdOvenState["WARMING"] = "0x04";
    ErdOvenState["PROBING"] = "0x05";
    ErdOvenState["TIMING_COOK"] = "0x06";
    ErdOvenState["SABBATH_DELAY"] = "0x07";
    ErdOvenState["SELF_CLEAN_STAGE_1"] = "0x08";
    ErdOvenState["SELF_CLEAN_STAGE_2"] = "0x09";
    ErdOvenState["SELF_CLEAN_STAGE_3"] = "0x0a";
    ErdOvenState["STEAM_CLEAN_STAGE_1"] = "0x0b";
    ErdOvenState["FROZEN_MEAL_DEFROST"] = "0x0f";
    ErdOvenState["CONVECTION_MULTI_RACK"] = "0x11";
    ErdOvenState["CONVECTION_ROAST"] = "0x12";
    ErdOvenState["CONVECTION_BAKE"] = "0x13";
    ErdOvenState["CONVECTION_BROIL"] = "0x14";
    ErdOvenState["AIR_FRY"] = "0x17";
})(ErdOvenState || (exports.ErdOvenState = ErdOvenState = {}));
// ─── Dishwasher ───────────────────────────────────────────────────────────────
var ErdDishwasher;
(function (ErdDishwasher) {
    ErdDishwasher["CYCLE_STATE"] = "0xa000";
    ErdDishwasher["OPERATING_MODE"] = "0xa001";
    ErdDishwasher["RINSE_AID_STATUS"] = "0xa005";
    ErdDishwasher["DOOR_COUNT"] = "0xa003";
    ErdDishwasher["TIME_REMAINING"] = "0xa004";
    ErdDishwasher["CYCLE_NAME"] = "0xa006";
    ErdDishwasher["PODS_REMAINING_VALUE"] = "0xa007";
    ErdDishwasher["DOOR_STATUS"] = "0xa010";
    ErdDishwasher["USER_CYCLE_PREF"] = "0xa011";
    ErdDishwasher["REMOTE_DELAY_START"] = "0xa012";
    ErdDishwasher["STEAM_SETTING"] = "0xa013";
    ErdDishwasher["HEATED_DRY_PREF"] = "0xa014";
    ErdDishwasher["WIFI_STATUS"] = "0xa01a";
    ErdDishwasher["CLEAN_STATE"] = "0xa020";
    ErdDishwasher["CYCLE_COUNT"] = "0xa022";
})(ErdDishwasher || (exports.ErdDishwasher = ErdDishwasher = {}));
var ErdDishwasherCycleState;
(function (ErdDishwasherCycleState) {
    ErdDishwasherCycleState["NONE"] = "0x00";
    ErdDishwasherCycleState["PRE_WASH"] = "0x01";
    ErdDishwasherCycleState["SENSING"] = "0x02";
    ErdDishwasherCycleState["MAIN_WASH"] = "0x03";
    ErdDishwasherCycleState["DRYING"] = "0x04";
    ErdDishwasherCycleState["SANITIZING"] = "0x05";
    ErdDishwasherCycleState["TURBIDITY_CAL"] = "0x06";
    ErdDishwasherCycleState["DIVERTER_CAL"] = "0x07";
    ErdDishwasherCycleState["PAUSE"] = "0x08";
    ErdDishwasherCycleState["RINSING"] = "0x09";
    ErdDishwasherCycleState["CLEAN"] = "0x0a";
})(ErdDishwasherCycleState || (exports.ErdDishwasherCycleState = ErdDishwasherCycleState = {}));
// ─── Laundry (Washer / Dryer) ─────────────────────────────────────────────────
var ErdLaundry;
(function (ErdLaundry) {
    ErdLaundry["CYCLE_STATE"] = "0x2000";
    ErdLaundry["TIME_REMAINING"] = "0x2001";
    ErdLaundry["DOOR_LOCK"] = "0x2003";
    ErdLaundry["DELAY_TIME_REMAINING"] = "0x2004";
    ErdLaundry["DOOR_STATUS"] = "0x2005";
    ErdLaundry["REMOTE_DELAY_START"] = "0x2007";
    ErdLaundry["WASHER_SOIL_LEVEL"] = "0x200a";
    ErdLaundry["WASHER_WATER_TEMP"] = "0x200b";
    ErdLaundry["WASHER_SPIN_SPEED"] = "0x200c";
    ErdLaundry["RINSE_OPTION"] = "0x200d";
    ErdLaundry["WASHER_SELECTED_CYCLE"] = "0x200e";
    ErdLaundry["DRYER_DRYNESS_LEVEL"] = "0x2014";
    ErdLaundry["DRYER_TEMPERATURE_OPTION"] = "0x2015";
    ErdLaundry["DRYER_SELECTED_CYCLE"] = "0x2016";
    ErdLaundry["DRYER_TUMBLE_STATUS"] = "0x2019";
    ErdLaundry["END_OF_CYCLE_SIGNAL"] = "0x2020";
    ErdLaundry["CYCLE_NAME"] = "0x2026";
})(ErdLaundry || (exports.ErdLaundry = ErdLaundry = {}));
var ErdLaundryCycleState;
(function (ErdLaundryCycleState) {
    ErdLaundryCycleState["NONE"] = "0x00";
    ErdLaundryCycleState["PRE_WASH"] = "0x01";
    ErdLaundryCycleState["SENSING"] = "0x02";
    ErdLaundryCycleState["FILL"] = "0x03";
    ErdLaundryCycleState["SOAK"] = "0x04";
    ErdLaundryCycleState["WASH"] = "0x05";
    ErdLaundryCycleState["RINSE"] = "0x06";
    ErdLaundryCycleState["SPIN"] = "0x07";
    ErdLaundryCycleState["DRAIN"] = "0x08";
    ErdLaundryCycleState["DRY"] = "0x09";
    ErdLaundryCycleState["STEAM"] = "0x0a";
    ErdLaundryCycleState["TUMBLE"] = "0x0b";
    ErdLaundryCycleState["COMPLETE"] = "0x0c";
    ErdLaundryCycleState["POWER_OFF"] = "0x0d";
    ErdLaundryCycleState["DELAY_WASH"] = "0x0e";
    ErdLaundryCycleState["DOOR_OPEN"] = "0x0f";
    ErdLaundryCycleState["CLEAN_SPEAK"] = "0x10";
    ErdLaundryCycleState["CYCLE_PAUSED"] = "0x11";
    ErdLaundryCycleState["DAMP_ALERT"] = "0x12";
    ErdLaundryCycleState["SMART_DELAY"] = "0x13";
})(ErdLaundryCycleState || (exports.ErdLaundryCycleState = ErdLaundryCycleState = {}));
// ─── Air Conditioner ──────────────────────────────────────────────────────────
var ErdAc;
(function (ErdAc) {
    ErdAc["AC_MODE"] = "0x0100";
    ErdAc["FAN_SPEED"] = "0x0103";
    ErdAc["TARGET_TEMP"] = "0x0105";
    ErdAc["CURRENT_TEMP"] = "0x010A";
    ErdAc["AC_STATUS"] = "0x0101";
    ErdAc["SLEEP_MODE"] = "0x0108";
    ErdAc["TIMER_ON"] = "0x010C";
    ErdAc["TIMER_OFF"] = "0x010D";
    ErdAc["SWING_MODE"] = "0x010E";
    ErdAc["WIFI_STATUS"] = "0x010F";
})(ErdAc || (exports.ErdAc = ErdAc = {}));
var ErdAcMode;
(function (ErdAcMode) {
    ErdAcMode["COOL"] = "0x00";
    ErdAcMode["FAN"] = "0x01";
    ErdAcMode["DRY"] = "0x02";
    ErdAcMode["HEAT"] = "0x03";
    ErdAcMode["ECO"] = "0x04";
})(ErdAcMode || (exports.ErdAcMode = ErdAcMode = {}));
var ErdAcFanSpeed;
(function (ErdAcFanSpeed) {
    ErdAcFanSpeed["AUTO"] = "0x00";
    ErdAcFanSpeed["LOW"] = "0x01";
    ErdAcFanSpeed["MEDIUM"] = "0x02";
    ErdAcFanSpeed["HIGH"] = "0x03";
})(ErdAcFanSpeed || (exports.ErdAcFanSpeed = ErdAcFanSpeed = {}));
// ─── Water Heater ─────────────────────────────────────────────────────────────
var ErdWaterHeater;
(function (ErdWaterHeater) {
    ErdWaterHeater["TARGET_TEMP"] = "0xe004";
    ErdWaterHeater["CURRENT_TEMP"] = "0xe005";
    ErdWaterHeater["OPERATING_MODE"] = "0xe000";
    ErdWaterHeater["VACATION_MODE"] = "0xe001";
    ErdWaterHeater["VACATION_HOURS"] = "0xe002";
    ErdWaterHeater["HOT_WATER_AVAILABILITY"] = "0xe006";
})(ErdWaterHeater || (exports.ErdWaterHeater = ErdWaterHeater = {}));
