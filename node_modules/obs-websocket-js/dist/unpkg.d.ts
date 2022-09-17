import JSONOBSWebSocket, { EventSubscription, OBSWebSocketError, RequestBatchExecutionType, WebSocketOpCode } from './json.js';
export default class OBSWebSocket extends JSONOBSWebSocket {
    static OBSWebSocketError: typeof OBSWebSocketError;
    static WebSocketOpCode: typeof WebSocketOpCode;
    static EventSubscription: typeof EventSubscription;
    static RequestBatchExecutionType: typeof RequestBatchExecutionType;
}
