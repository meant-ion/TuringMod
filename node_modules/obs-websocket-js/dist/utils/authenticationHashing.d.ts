/**
 * SHA256 Hashing.
 *
 * @param  {string} [salt=''] salt.
 * @param  {string} [challenge=''] challenge.
 * @param  {string} msg Message to encode.
 * @returns {string} sha256 encoded string.
 */
export default function (salt: string, challenge: string, msg: string): string;
