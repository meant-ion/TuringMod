"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Twocket = void 0;
var node_fetch_1 = require("node-fetch");
var ws_1 = require("ws");
var Twocket = /** @class */ (function () {
    function Twocket(twitchUserId, twitchClientId, twitchAccessToken, scopesToRegister) {
        this.TWITCH_USER_ID = twitchUserId;
        this.TWITCH_CLIENT_ID = twitchClientId;
        this.TWITCH_ACCESS_TOKEN = twitchAccessToken;
        this.scopes = scopesToRegister;
        this.activeListeners = {};
    }
    Twocket.prototype.setTwitchSocketId = function (socketId) {
        this.TWITCH_SOCKET_ID = socketId;
    };
    Twocket.prototype.registerScopes = function () {
        var _this = this;
        var _a;
        //Register Events for given scopes
        if (this.scopes.length < 1) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
            throw new Error('Scopes cannot be 0, ensure you are adding this to the constructor!');
        }
        else {
            this.scopes.forEach(function (scope) {
                //register
                _this.sendSubscriptionRequestToTwitch(scope);
            });
        }
    };
    /**
     * Handles the management of Websocket connection, websocket reconnect requests and
     * event handling.
     * @param wsUrl - Websocket URL to connect to
     * @param isReconnect - Determines if this is a reconnect URL
     */
    Twocket.prototype.connect = function (wsUrl, isReconnect) {
        var _this = this;
        if (isReconnect === void 0) { isReconnect = false; }
        var newWs = new ws_1.WebSocket(wsUrl);
        newWs.on('message', function (data) {
            var parsedData = JSON.parse(data.toString());
            switch (parsedData.metadata["message_type"]) {
                case "session_welcome":
                    _this.setTwitchSocketId(parsedData.payload.session.id);
                    if (isReconnect == false) {
                        _this.registerScopes();
                        _this.ws = newWs;
                    }
                    else {
                        _this.ws.close();
                        _this.ws = newWs;
                    }
                    break;
                case "session_reconnect":
                    //Do reconnect things
                    console.log("Reconnecting");
                    var reconnectUrl = parsedData.payload.session.reconnect_url;
                    _this.connect(reconnectUrl, true);
                    break;
                case "notification":
                    //This needs to be more generic to allow for other event types not specified
                    var subType = parsedData.metadata["subscription_type"];
                    if (subType in _this.activeListeners) {
                        _this.activeListeners[subType](parsedData.payload.event);
                    }
                    else {
                        console.log("Handler Subscription type not found - " + subType);
                    }
                    break;
                case "revocation":
                    var revokedSubscription = parsedData.payload.subscription;
                    //TODO Optional Logging here
                    console.log(revokedSubscription.type + " subscription revoked. Reason - " + revokedSubscription.status);
                    break;
            }
        });
    };
    Twocket.prototype.start = function () {
        //Do websocket things
        this.connect("wss://eventsub.wss.twitch.tv/ws");
    };
    Twocket.prototype.stop = function () {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
    };
    /**
     * Outputs a list of active subscriptions to track which are currently marked as "Active"
     */
    Twocket.prototype.getCurrentSubscriptions = function () {
        var options = {
            method: 'GET',
            headers: {
                Authorization: "Bearer ".concat(this.TWITCH_ACCESS_TOKEN),
                'Client-Id': this.TWITCH_CLIENT_ID
            }
        };
        (0, node_fetch_1.default)('https://api.twitch.tv/helix/eventsub/subscriptions?status=enabled', options).then(function (response) {
            if (!response.ok) {
                throw new Error("Error retrieving subscriptions - " + response.status);
            }
            else {
                response.json().then(function (response) {
                    console.log(response.data.length + " active subscriptions found.");
                    for (var i = 0; i < response.data.length; i++) {
                        console.log(response.data[i].type + " subscription is active");
                    }
                });
            }
        });
    };
    /**
     *
     * @param subscriptionType - the type of event you want to subscribe to listen for e.g. "channel.follow"
     * More info found at - https://dev.twitch.tv/docs/api/reference#create-eventsub-subscription
     */
    Twocket.prototype.sendSubscriptionRequestToTwitch = function (subscriptionType) {
        //TODO Potential validation on the subscrtiptionType to ensure the user is requesting a 
        //valid (or already requested sub type).
        var body = "{\"type\":\"".concat(subscriptionType, "\",\"version\":\"1\",\"condition\":{\"broadcaster_user_id\":\"").concat(this.TWITCH_USER_ID, "\"},\"transport\":{\"method\":\"websocket\",\"session_id\":\"").concat(this.TWITCH_SOCKET_ID, "\"}}");
        if (subscriptionType == "channel.raid") {
            //NOTE This is hardcoded to only create subscriptions for raids coming to the channel
            body = "{\"type\":\"".concat(subscriptionType, "\",\"version\":\"1\",\"condition\":{\"to_broadcaster_user_id\":\"").concat(this.TWITCH_USER_ID, "\"},\"transport\":{\"method\":\"websocket\",\"session_id\":\"").concat(this.TWITCH_SOCKET_ID, "\"}}");
        }
        var options = {
            method: 'POST',
            body: body,
            headers: {
                Authorization: "Bearer ".concat(this.TWITCH_ACCESS_TOKEN),
                'Client-Id': this.TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            }
        };
        (0, node_fetch_1.default)('https://api.twitch.tv/helix/eventsub/subscriptions', options).then(function (response) {
            if (!response.ok) {
                throw new Error("Error creating subscription - " + response.status);
            }
            else {
                //TODO Maybe do verbose logging of creating connections?
                console.log(subscriptionType + " subscription created");
            }
        });
    };
    /** Handler handlers.
    *
    *   A suite of handlers for dealing with the various subscription types.
    *   They are simple setters but each of them have their own related parameters
    *   e.g. RewardRedemptionPayloadEvent
    *
    *   These are convenience methods, for the most common use cases, if you require other eventsub events,
    *   check out the generic setEventSubHandler().
    */
    Twocket.prototype.setOnChannelPointRewardRedeem = function (newHandler) {
        this.setEventSubHandler("channel.channel_points_custom_reward_redemption.add", newHandler);
    };
    Twocket.prototype.setOnFollowEvent = function (newHandler) {
        this.setEventSubHandler("channel.follow", newHandler);
    };
    Twocket.prototype.setOnSubscribeEvent = function (newHandler) {
        this.setEventSubHandler("channel.subscribe", newHandler);
    };
    Twocket.prototype.setOnRaidEvent = function (newHandler) {
        this.setEventSubHandler("channel.raid", newHandler);
    };
    Twocket.prototype.setOnCheerEvent = function (newHandler) {
        this.setEventSubHandler("channel.cheer", newHandler);
    };
    Twocket.prototype.setOnGiftSubscribeEvent = function (newHandler) {
        this.setEventSubHandler("channel.subscription.gift", newHandler);
    };
    /**
     * A generic method of supplying an event handler to a given subscription type event
     *
     * @param eventType - EventSub Subscription type
     * @param newHandler - event handler to trigger when given event is received on the socket.
     */
    Twocket.prototype.setEventSubHandler = function (eventType, newHandler) {
        this.activeListeners[eventType] = newHandler;
    };
    return Twocket;
}());
exports.Twocket = Twocket;
