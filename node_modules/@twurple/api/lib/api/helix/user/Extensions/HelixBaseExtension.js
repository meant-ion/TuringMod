"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelixBaseExtension = void 0;
const common_1 = require("@twurple/common");
/** @protected */
class HelixBaseExtension extends common_1.DataObject {
    /**
     * The ID of the extension.
     */
    get id() {
        return this[common_1.rawDataSymbol].id;
    }
    /**
     * The version of the extension.
     */
    get version() {
        return this[common_1.rawDataSymbol].version;
    }
    /**
     * The name of the extension.
     */
    get name() {
        return this[common_1.rawDataSymbol].name;
    }
}
exports.HelixBaseExtension = HelixBaseExtension;
