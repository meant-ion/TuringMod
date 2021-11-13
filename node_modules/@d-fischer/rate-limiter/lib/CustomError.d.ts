/** @private */
export declare class CustomError extends Error {
    constructor(...params: [string, string?, string?]);
    get name(): string;
}
