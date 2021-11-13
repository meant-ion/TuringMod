"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHostName = void 0;
function checkHostName(hostName) {
    if (hostName.includes('/')) {
        throw new Error(`You passed a \`hostName\` parameter that contains a slash.
Host names can not contain slashes; they're only the domain part of the URL and do not include a protocol (like http[s]://) or a path.

Please remove the protocol from the parameter and/or move any path to the \`pathPrefix\` parameter, if necessary.`);
    }
}
exports.checkHostName = checkHostName;
