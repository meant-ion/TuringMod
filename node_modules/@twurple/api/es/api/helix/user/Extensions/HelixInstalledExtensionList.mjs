import { __decorate } from "tslib";
import { DataObject, rawDataSymbol, rtfm } from '@twurple/common';
import { HelixInstalledExtension } from "./HelixInstalledExtension.mjs";
/**
 * A list of extensions installed in a channel.
 */
let HelixInstalledExtensionList = class HelixInstalledExtensionList extends DataObject {
    getExtensionAtSlot(type, slotId) {
        const data = this[rawDataSymbol][type][slotId];
        return data.active ? new HelixInstalledExtension(type, slotId, data) : null;
    }
    getExtensionsForSlotType(type) {
        return [...Object.entries(this[rawDataSymbol][type])]
            .filter((entry) => entry[1].active)
            .map(([slotId, slotData]) => new HelixInstalledExtension(type, slotId, slotData));
    }
    getAllExtensions() {
        return [...Object.entries(this[rawDataSymbol])].flatMap(([type, typeEntries]) => [...Object.entries(typeEntries)]
            .filter((entry) => entry[1].active)
            .map(([slotId, slotData]) => new HelixInstalledExtension(type, slotId, slotData)));
    }
};
HelixInstalledExtensionList = __decorate([
    rtfm('api', 'HelixInstalledExtensionList')
], HelixInstalledExtensionList);
export { HelixInstalledExtensionList };
