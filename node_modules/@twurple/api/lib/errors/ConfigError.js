"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigError = void 0;
const common_1 = require("@twurple/common");
/**
 * Thrown whenever you try using invalid values in the client configuration.
 */
class ConfigError extends common_1.CustomError {
}
exports.ConfigError = ConfigError;
