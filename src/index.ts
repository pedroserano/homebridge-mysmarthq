/**
 * Homebridge SmartHQ Plugin — Entry Point
 *
 * This is the file referenced by `"main"` in package.json (compiled to dist/index.js).
 * Homebridge calls the exported function with its API instance, and we register
 * our dynamic platform here.
 */

import { API } from 'homebridge';
import { PLATFORM_NAME } from './settings';
import { SmartHQPlatform } from './platform';

export default (api: API): void => {
  api.registerPlatform(PLATFORM_NAME, SmartHQPlatform);
};
