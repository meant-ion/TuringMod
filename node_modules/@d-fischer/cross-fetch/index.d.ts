/// <reference lib="dom" />

declare const _fetch: typeof globalThis.fetch;
declare const _Request: typeof globalThis.Request;
declare const _Response: typeof globalThis.Response;
declare const _Headers: typeof globalThis.Headers;

export const fetch: typeof _fetch;
export const Request: typeof _Request;
export const Response: typeof _Response;
export const Headers: typeof _Headers;
export default fetch;
