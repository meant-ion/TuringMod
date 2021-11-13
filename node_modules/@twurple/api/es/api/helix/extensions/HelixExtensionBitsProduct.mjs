import { __decorate } from "tslib";
import { mapNullable } from '@d-fischer/shared-utils';
import { DataObject, rawDataSymbol, rtfm } from '@twurple/common';
/**
 * An extension's product to purchase with Bits.
 */
let HelixExtensionBitsProduct = class HelixExtensionBitsProduct extends DataObject {
    /**
     * The product's unique identifier.
     */
    get sku() {
        return this[rawDataSymbol].sku;
    }
    /**
     * The product's cost, in bits.
     */
    get cost() {
        return this[rawDataSymbol].cost.amount;
    }
    /**
     * The product's display name.
     */
    get displayName() {
        return this[rawDataSymbol].display_name;
    }
    /**
     * Whether the product is in development.
     */
    get inDevelopment() {
        return this[rawDataSymbol].in_development;
    }
    /**
     * Whether the product's purchases is broadcast to all users.
     */
    get isBroadcast() {
        return this[rawDataSymbol].is_broadcast;
    }
    /**
     * The product's expiration date. If the product never expires, this is null.
     */
    get expirationDate() {
        return mapNullable(this[rawDataSymbol].expiration, exp => new Date(exp));
    }
};
HelixExtensionBitsProduct = __decorate([
    rtfm('api', 'HelixExtensionBitsProduct', 'sku')
], HelixExtensionBitsProduct);
export { HelixExtensionBitsProduct };
