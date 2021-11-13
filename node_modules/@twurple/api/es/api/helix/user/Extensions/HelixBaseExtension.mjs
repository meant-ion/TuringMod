import { DataObject, rawDataSymbol } from '@twurple/common';
/** @protected */
export class HelixBaseExtension extends DataObject {
    /**
     * The ID of the extension.
     */
    get id() {
        return this[rawDataSymbol].id;
    }
    /**
     * The version of the extension.
     */
    get version() {
        return this[rawDataSymbol].version;
    }
    /**
     * The name of the extension.
     */
    get name() {
        return this[rawDataSymbol].name;
    }
}
