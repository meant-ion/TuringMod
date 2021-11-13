"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidTokenTypeError = void 0;
const common_1 = require("@twurple/common");
/**
 * Thrown whenever a different token type (user vs. app) is expected in the method you're calling.
 */
class InvalidTokenTypeError extends common_1.CustomError {
}
exports.InvalidTokenTypeError = InvalidTokenTypeError;
