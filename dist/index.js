"use strict";
/**
 * Homebridge SmartHQ Plugin — Entry Point
 *
 * This is the file referenced by `"main"` in package.json (compiled to dist/index.js).
 * Homebridge calls the exported function with its API instance, and we register
 * our dynamic platform here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./settings");
const platform_1 = require("./platform");
exports.default = (api) => {
    api.registerPlatform(settings_1.PLATFORM_NAME, platform_1.SmartHQPlatform);
};
