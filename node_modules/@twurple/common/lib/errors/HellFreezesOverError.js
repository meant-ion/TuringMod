"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HellFreezesOverError = void 0;
const CustomError_1 = require("./CustomError");
/**
 * These are the kind of errors that should never happen.
 *
 * If you see one thrown, please file a bug in the GitHub issue tracker.
 */
class HellFreezesOverError extends CustomError_1.CustomError {
    constructor(message) {
        super(`${message} - this should never happen, please file a bug in the GitHub issue tracker`);
    }
}
exports.HellFreezesOverError = HellFreezesOverError;
