"use strict";
/**
 * ERD Value Encoder / Decoder Utilities
 *
 * GE SmartHQ sends all property values as hex strings (no "0x" prefix).
 * This module provides typed encode/decode helpers for common value types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToUint = hexToUint;
exports.uintToHex = uintToHex;
exports.hexToInt = hexToInt;
exports.hexToBool = hexToBool;
exports.boolToHex = boolToHex;
exports.erdTempToFahrenheit = erdTempToFahrenheit;
exports.fahrenheitToErd = fahrenheitToErd;
exports.fahrenheitToCelsius = fahrenheitToCelsius;
exports.celsiusToFahrenheit = celsiusToFahrenheit;
exports.erdTimeToSeconds = erdTimeToSeconds;
exports.secondsToErdTime = secondsToErdTime;
exports.getBit = getBit;
exports.setBit = setBit;
exports.decodeDoorStatus = decodeDoorStatus;
exports.decodeLaundryTimeRemaining = decodeLaundryTimeRemaining;
exports.decodeAcTemp = decodeAcTemp;
exports.encodeAcTemp = encodeAcTemp;
// ─── Primitive helpers ────────────────────────────────────────────────────────
/** Decode a hex string to an unsigned integer */
function hexToUint(hex) {
    if (!hex)
        return 0;
    return parseInt(hex, 16);
}
/** Encode an unsigned integer to a zero-padded hex string */
function uintToHex(value, byteLen = 1) {
    return value.toString(16).padStart(byteLen * 2, '0');
}
/** Decode a hex string to a signed integer (two's complement) */
function hexToInt(hex, byteLen = 2) {
    const raw = hexToUint(hex);
    const max = Math.pow(2, byteLen * 8);
    return raw >= max / 2 ? raw - max : raw;
}
/** Decode a boolean from a single hex byte: "00" → false, anything else → true */
function hexToBool(hex) {
    return hexToUint(hex) !== 0;
}
/** Encode a boolean to a hex byte */
function boolToHex(val) {
    return val ? '01' : '00';
}
// ─── Temperature helpers ──────────────────────────────────────────────────────
/**
 * GE temps are stored as signed 16-bit integers in units of 1°F (US) or
 * a mapping where the raw value may be °F internally even in EU/metric mode.
 * TEMPERATURE_UNIT ERD (0x0007): "00" = Fahrenheit, "01" = Celsius
 */
function erdTempToFahrenheit(hex) {
    // Temperatures are usually 2 bytes, big-endian, signed
    return hexToInt(hex, 2);
}
function fahrenheitToErd(tempF) {
    // Clamp to valid oven/fridge range and encode as signed 16-bit
    const clamped = Math.round(Math.max(-40, Math.min(tempF, 650)));
    const val = clamped < 0 ? clamped + 65536 : clamped;
    return uintToHex(val, 2);
}
function fahrenheitToCelsius(tempF) {
    return Math.round((tempF - 32) * 5 / 9);
}
function celsiusToFahrenheit(tempC) {
    return Math.round(tempC * 9 / 5 + 32);
}
// ─── Time helpers ─────────────────────────────────────────────────────────────
/** Decode a 3-byte (HHMMSS) or 2-byte (HHMM) time ERD value to seconds */
function erdTimeToSeconds(hex) {
    if (!hex || hex === '000000' || hex === '0000')
        return 0;
    if (hex.length <= 4) {
        // 2-byte: HHMM
        const h = hexToUint(hex.slice(0, 2));
        const m = hexToUint(hex.slice(2, 4));
        return h * 3600 + m * 60;
    }
    // 3-byte: HHMMSS
    const h = hexToUint(hex.slice(0, 2));
    const m = hexToUint(hex.slice(2, 4));
    const s = hexToUint(hex.slice(4, 6));
    return h * 3600 + m * 60 + s;
}
function secondsToErdTime(totalSeconds, byteLen = 3) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (byteLen === 2)
        return `${uintToHex(h)}${uintToHex(m)}`;
    return `${uintToHex(h)}${uintToHex(m)}${uintToHex(s)}`;
}
// ─── Bitmask helpers ──────────────────────────────────────────────────────────
function getBit(hex, bit) {
    return (hexToUint(hex) & (1 << bit)) !== 0;
}
function setBit(hex, bit, val, byteLen = 1) {
    let n = hexToUint(hex);
    if (val)
        n |= (1 << bit);
    else
        n &= ~(1 << bit);
    return uintToHex(n & 0xFFFF, byteLen);
}
// ─── Appliance-specific decoders ─────────────────────────────────────────────
/**
 * Decode fridge/freezer door status bitmask.
 * Bit 0 = fridge door, Bit 1 = freezer door, Bit 2 = drawer
 */
function decodeDoorStatus(hex) {
    const n = hexToUint(hex);
    return {
        fridge: (n & 0x01) !== 0,
        freezer: (n & 0x02) !== 0,
        drawer: (n & 0x04) !== 0,
    };
}
/**
 * Decode laundry time-remaining from a 3-byte hex value.
 * Returns minutes remaining (0 if machine is off).
 */
function decodeLaundryTimeRemaining(hex) {
    return Math.round(erdTimeToSeconds(hex) / 60);
}
/**
 * Decode A/C target temperature.
 * Stored as 1 byte in Fahrenheit offset from 60°F baseline:
 *   raw 0x00 = 60°F, 0x12 = 78°F, etc.
 * Some models use absolute °F in a 1-byte field directly.
 */
function decodeAcTemp(hex) {
    const raw = hexToUint(hex);
    // Raw >= 60: treat as absolute °F
    return raw >= 60 ? raw : raw + 60;
}
function encodeAcTemp(tempF) {
    const clamped = Math.max(60, Math.min(tempF, 90));
    return uintToHex(clamped);
}
