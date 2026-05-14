/**
 * ERD Value Encoder / Decoder Utilities
 *
 * GE SmartHQ sends all property values as hex strings (no "0x" prefix).
 * This module provides typed encode/decode helpers for common value types.
 */
/** Decode a hex string to an unsigned integer */
export declare function hexToUint(hex: string): number;
/** Encode an unsigned integer to a zero-padded hex string */
export declare function uintToHex(value: number, byteLen?: number): string;
/** Decode a hex string to a signed integer (two's complement) */
export declare function hexToInt(hex: string, byteLen?: number): number;
/** Decode a boolean from a single hex byte: "00" → false, anything else → true */
export declare function hexToBool(hex: string): boolean;
/** Encode a boolean to a hex byte */
export declare function boolToHex(val: boolean): string;
/**
 * GE temps are stored as signed 16-bit integers in units of 1°F (US) or
 * a mapping where the raw value may be °F internally even in EU/metric mode.
 * TEMPERATURE_UNIT ERD (0x0007): "00" = Fahrenheit, "01" = Celsius
 */
export declare function erdTempToFahrenheit(hex: string): number;
export declare function fahrenheitToErd(tempF: number): string;
export declare function fahrenheitToCelsius(tempF: number): number;
export declare function celsiusToFahrenheit(tempC: number): number;
/** Decode a 3-byte (HHMMSS) or 2-byte (HHMM) time ERD value to seconds */
export declare function erdTimeToSeconds(hex: string): number;
export declare function secondsToErdTime(totalSeconds: number, byteLen?: number): string;
export declare function getBit(hex: string, bit: number): boolean;
export declare function setBit(hex: string, bit: number, val: boolean, byteLen?: number): string;
/**
 * Decode fridge/freezer door status bitmask.
 * Bit 0 = fridge door, Bit 1 = freezer door, Bit 2 = drawer
 */
export declare function decodeDoorStatus(hex: string): {
    fridge: boolean;
    freezer: boolean;
    drawer: boolean;
};
/**
 * Decode laundry time-remaining from a 3-byte hex value.
 * Returns minutes remaining (0 if machine is off).
 */
export declare function decodeLaundryTimeRemaining(hex: string): number;
/**
 * Decode A/C target temperature.
 * Stored as 1 byte in Fahrenheit offset from 60°F baseline:
 *   raw 0x00 = 60°F, 0x12 = 78°F, etc.
 * Some models use absolute °F in a 1-byte field directly.
 */
export declare function decodeAcTemp(hex: string): number;
export declare function encodeAcTemp(tempF: number): string;
