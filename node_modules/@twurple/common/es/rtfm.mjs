/** @private */
export function rtfm(pkg, name, idKey) {
    return clazz => {
        const fn = idKey
            ? function () {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return `[${name}#${this[idKey]} - please check https://twurple.js.org/reference/${pkg}/classes/${name}.html for available properties]`;
            }
            : function () {
                return `[${name} - please check https://twurple.js.org/reference/${pkg}/classes/${name}.html for available properties]`;
            };
        Object.defineProperty(clazz.prototype, Symbol.for('nodejs.util.inspect.custom'), {
            value: fn,
            enumerable: false
        });
    };
}
