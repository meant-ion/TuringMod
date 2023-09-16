import { BaseOBSWebSocket } from './base.js';
export { OBSWebSocketError } from './base.js';
export type { EventTypes } from './base.js';
import { type IncomingMessage, type OutgoingMessage } from './types.js';
export * from './types.js';
export default class OBSWebSocket extends BaseOBSWebSocket {
    protocol: string;
    protected encodeMessage(data: OutgoingMessage): Promise<string>;
    protected decodeMessage(data: string): Promise<IncomingMessage>;
}
