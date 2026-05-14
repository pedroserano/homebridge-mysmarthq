/**
 * ERD (Extended Resource Descriptor) Code Definitions
 *
 * GE SmartHQ communicates device state via hex property codes called ERDs.
 * Values are sent as hex strings (no leading "0x"), JSON-encoded in a dict.
 *
 * Source: gehomesdk + GEMaker reverse-engineering repos
 */
export declare enum ErdCommon {
    APPLIANCE_TYPE = "0x0008",
    MODEL_NUMBER = "0x0001",
    SERIAL_NUMBER = "0x0002",
    WIFI_MODULE_SW_VERSION = "0x0100",
    WIFI_MODULE_HW_VERSION = "0x0101",
    CLOCK_FORMAT = "0x0006",
    TEMPERATURE_UNIT = "0x0007",
    ACK = "0x0012",
    SABBATH_MODE = "0x0009",
    USER_INTERFACE_LOCKED = "0x000A",
    SOUND_LEVEL = "0x000D",
    REMOTE_ENABLE = "0x000F"
}
export declare enum ErdApplianceType {
    UNKNOWN = "0x00",
    REFRIGERATOR = "0x01",
    RANGE = "0x02",
    MICROWAVE = "0x07",
    DISHWASHER = "0x08",
    WASHER = "0x0a",
    DRYER = "0x0b",
    AIR_CONDITIONER = "0x0e",
    WATER_HEATER = "0x1b",
    ADVANTIUM = "0x21",
    ESPRESSO_MAKER = "0x28",
    COFFEE_MAKER = "0x29",
    ICE_MAKER = "0x2a",
    HOOD = "0x43",
    WATER_SOFTENER = "0x52",
    WATER_FILTER = "0x53",
    BEVERAGE_CENTER = "0x62"
}
export declare enum ErdFridge {
    CURRENT_TEMPERATURE = "0x1004",// signed int, °F or °C per TEMPERATURE_UNIT
    TARGET_TEMPERATURE = "0x1005",
    DOOR_STATUS = "0x1007",// bitmask: bit0=fridge, bit1=freezer, bit2=drawer
    HOT_WATER_STATUS = "0x1009",
    FRESH_FOOD_TARGET_TEMP = "0x1006",
    FREEZER_TARGET_TEMP = "0x100a",
    FRESH_FOOD_TEMP = "0x1004",
    FREEZER_TEMP = "0x1003",
    ICE_MAKER_ENABLE_STATUS = "0x1013",
    ICE_MAKER_BUCKET_STATUS = "0x1011",
    HOT_WATER_SET_TEMP = "0x1008",
    FILTER_STATUS = "0x1009"
}
export declare enum ErdOven {
    UPPER_OVEN_COOK_MODE = "0x5120",
    UPPER_OVEN_CURRENT_STATE = "0x5124",
    UPPER_OVEN_PROBE_PRESENT = "0x5123",
    UPPER_OVEN_PROBE_TEMP = "0x5125",
    UPPER_OVEN_CURRENT_TEMP = "0x5126",
    UPPER_OVEN_TARGET_TEMP = "0x5121",
    UPPER_OVEN_KITCHEN_TIMER = "0x5127",
    UPPER_OVEN_ELAPSED_TIME = "0x5128",
    UPPER_OVEN_DISPLAY_TEMP = "0x5129",
    LOWER_OVEN_COOK_MODE = "0x5200",
    LOWER_OVEN_CURRENT_STATE = "0x5204",
    LOWER_OVEN_PROBE_PRESENT = "0x5203",
    LOWER_OVEN_PROBE_TEMP = "0x5205",// also LOWER_OVEN_KITCHEN_TIMER per docs
    LOWER_OVEN_CURRENT_TEMP = "0x5206",
    LOWER_OVEN_TARGET_TEMP = "0x5201",
    LOWER_OVEN_KITCHEN_TIMER = "0x5205",
    LOWER_OVEN_ELAPSED_TIME = "0x5208",
    LOWER_OVEN_DISPLAY_TEMP = "0x5209",
    OVEN_CONFIGURATION = "0x5110",
    CONVECTION_CONVERSION = "0x5111",
    AVAILABLE_COOK_MODES = "0x5112",
    PREHEAT_DURATION = "0x5113"
}
export declare enum ErdOvenState {
    NO_OPERATION = "0x00",
    PREHEATING = "0x01",
    BAKING = "0x02",
    BROILING = "0x03",
    WARMING = "0x04",
    PROBING = "0x05",
    TIMING_COOK = "0x06",
    SABBATH_DELAY = "0x07",
    SELF_CLEAN_STAGE_1 = "0x08",
    SELF_CLEAN_STAGE_2 = "0x09",
    SELF_CLEAN_STAGE_3 = "0x0a",
    STEAM_CLEAN_STAGE_1 = "0x0b",
    FROZEN_MEAL_DEFROST = "0x0f",
    CONVECTION_MULTI_RACK = "0x11",
    CONVECTION_ROAST = "0x12",
    CONVECTION_BAKE = "0x13",
    CONVECTION_BROIL = "0x14",
    AIR_FRY = "0x17"
}
export declare enum ErdDishwasher {
    CYCLE_STATE = "0xa000",
    OPERATING_MODE = "0xa001",
    RINSE_AID_STATUS = "0xa005",
    DOOR_COUNT = "0xa003",
    TIME_REMAINING = "0xa004",
    CYCLE_NAME = "0xa006",
    PODS_REMAINING_VALUE = "0xa007",
    DOOR_STATUS = "0xa010",
    USER_CYCLE_PREF = "0xa011",
    REMOTE_DELAY_START = "0xa012",
    STEAM_SETTING = "0xa013",
    HEATED_DRY_PREF = "0xa014",
    WIFI_STATUS = "0xa01a",
    CLEAN_STATE = "0xa020",
    CYCLE_COUNT = "0xa022"
}
export declare enum ErdDishwasherCycleState {
    NONE = "0x00",
    PRE_WASH = "0x01",
    SENSING = "0x02",
    MAIN_WASH = "0x03",
    DRYING = "0x04",
    SANITIZING = "0x05",
    TURBIDITY_CAL = "0x06",
    DIVERTER_CAL = "0x07",
    PAUSE = "0x08",
    RINSING = "0x09",
    CLEAN = "0x0a"
}
export declare enum ErdLaundry {
    CYCLE_STATE = "0x2000",
    TIME_REMAINING = "0x2001",
    DOOR_LOCK = "0x2003",
    DELAY_TIME_REMAINING = "0x2004",
    DOOR_STATUS = "0x2005",
    REMOTE_DELAY_START = "0x2007",
    WASHER_SOIL_LEVEL = "0x200a",
    WASHER_WATER_TEMP = "0x200b",
    WASHER_SPIN_SPEED = "0x200c",
    RINSE_OPTION = "0x200d",
    WASHER_SELECTED_CYCLE = "0x200e",
    DRYER_DRYNESS_LEVEL = "0x2014",
    DRYER_TEMPERATURE_OPTION = "0x2015",
    DRYER_SELECTED_CYCLE = "0x2016",
    DRYER_TUMBLE_STATUS = "0x2019",
    END_OF_CYCLE_SIGNAL = "0x2020",
    CYCLE_NAME = "0x2026"
}
export declare enum ErdLaundryCycleState {
    NONE = "0x00",
    PRE_WASH = "0x01",
    SENSING = "0x02",
    FILL = "0x03",
    SOAK = "0x04",
    WASH = "0x05",
    RINSE = "0x06",
    SPIN = "0x07",
    DRAIN = "0x08",
    DRY = "0x09",
    STEAM = "0x0a",
    TUMBLE = "0x0b",
    COMPLETE = "0x0c",
    POWER_OFF = "0x0d",
    DELAY_WASH = "0x0e",
    DOOR_OPEN = "0x0f",
    CLEAN_SPEAK = "0x10",
    CYCLE_PAUSED = "0x11",
    DAMP_ALERT = "0x12",
    SMART_DELAY = "0x13"
}
export declare enum ErdAc {
    AC_MODE = "0x0100",
    FAN_SPEED = "0x0103",
    TARGET_TEMP = "0x0105",
    CURRENT_TEMP = "0x010A",
    AC_STATUS = "0x0101",
    SLEEP_MODE = "0x0108",
    TIMER_ON = "0x010C",
    TIMER_OFF = "0x010D",
    SWING_MODE = "0x010E",
    WIFI_STATUS = "0x010F"
}
export declare enum ErdAcMode {
    COOL = "0x00",
    FAN = "0x01",
    DRY = "0x02",
    HEAT = "0x03",
    ECO = "0x04"
}
export declare enum ErdAcFanSpeed {
    AUTO = "0x00",
    LOW = "0x01",
    MEDIUM = "0x02",
    HIGH = "0x03"
}
export declare enum ErdWaterHeater {
    TARGET_TEMP = "0xe004",
    CURRENT_TEMP = "0xe005",
    OPERATING_MODE = "0xe000",
    VACATION_MODE = "0xe001",
    VACATION_HOURS = "0xe002",
    HOT_WATER_AVAILABILITY = "0xe006"
}
