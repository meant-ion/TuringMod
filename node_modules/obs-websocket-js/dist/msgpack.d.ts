import { BaseOBSWebSocket } from './base.js';
export { OBSWebSocketError } from './base.js';
export type { EventTypes } from './base.js';
import { IncomingMessage, OutgoingMessage } from './types.js';
export * from './types.js';
export default class OBSWebSocket extends BaseOBSWebSocket {
    protocol: string;
    protected encodeMessage(data: OutgoingMessage): Promise<ArrayBufferView>;
    protected decodeMessage(data: ArrayBuffer | Blob): Promise<IncomingMessage>;
}
