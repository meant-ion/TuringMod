import { __decorate } from "tslib";
import { rawDataSymbol, rtfm } from '@twurple/common';
import { HelixBaseExtension } from "./HelixBaseExtension.mjs";
/**
 * A Twitch Extension that was installed by a user.
 *
 * @inheritDoc
 */
let HelixUserExtension = class HelixUserExtension extends HelixBaseExtension {
    /**
     * Whether the user has configured the extension to be able to activate it.
     */
    get canActivate() {
        return this[rawDataSymbol].can_activate;
    }
    /**
     * The available types of the extension.
     */
    get types() {
        return this[rawDataSymbol].type;
    }
};
HelixUserExtension = __decorate([
    rtfm('api', 'HelixUserExtension', 'id')
], HelixUserExtension);
export { HelixUserExtension };
