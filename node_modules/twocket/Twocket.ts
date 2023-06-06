import fetch from 'node-fetch';
import { RawData, WebSocket } from 'ws';
import { BasicWebsocketPayloadEvent, CheerPayloadEvent, FollowPayloadEvent, RaidPayloadEvent, RewardRedemptionPayloadEvent, RewardRedemptionPayloadReward, SubscriptionGiftPayloadEvent, SubscriptionPayloadEvent, WebsocketPayloadEvent } from './WebSocketPayloadEvent';

class Twocket {
    private TWITCH_USER_ID: string;
    private TWITCH_CLIENT_ID: string;
    private TWITCH_ACCESS_TOKEN: string;
    private ws!: WebSocket;
    private TWITCH_SOCKET_ID!: string;
    private scopes: string[] | [];

    private activeListeners: { [key: string]: (eventData: any) => void };

    constructor(twitchUserId: string, twitchClientId: string, twitchAccessToken: string, scopesToRegister: string[]) {
        this.TWITCH_USER_ID = twitchUserId;
        this.TWITCH_CLIENT_ID = twitchClientId;
        this.TWITCH_ACCESS_TOKEN = twitchAccessToken;
        this.scopes = scopesToRegister;
        this.activeListeners = {};
    }

    private setTwitchSocketId(socketId: string) {
        this.TWITCH_SOCKET_ID = socketId;
    }

    private registerScopes() {
        //Register Events for given scopes
        if (this.scopes.length < 1) {
            this.ws?.close();
            throw new Error('Scopes cannot be 0, ensure you are adding this to the constructor!');
        } else {
            this.scopes.forEach(scope => {
                //register
                this.sendSubscriptionRequestToTwitch(scope);
            });
        }
    }

    /**
     * Handles the management of Websocket connection, websocket reconnect requests and 
     * event handling.
     * @param wsUrl - Websocket URL to connect to
     * @param isReconnect - Determines if this is a reconnect URL
     */
    private connect(wsUrl: string, isReconnect = false) {
        let newWs = new WebSocket(wsUrl);

        newWs.on('message', (data: RawData) => {
            let parsedData = JSON.parse(data.toString());

            switch (parsedData.metadata["message_type"]) {
                case "session_welcome":
                    this.setTwitchSocketId(parsedData.payload.session.id);
                    
                    if(isReconnect == false) {
                        this.registerScopes();
                        this.ws = newWs;
                    } else {
                        this.ws.close();
                        this.ws = newWs;
                    }    

                    break;

                case "session_reconnect":
                    //Do reconnect things
                    console.log("Reconnecting");
                    let reconnectUrl = parsedData.payload.session.reconnect_url;
                    this.connect(reconnectUrl, true);

                    break;

                case "notification":
                    //This needs to be more generic to allow for other event types not specified
                    let subType = parsedData.metadata["subscription_type"];

                    if (subType in this.activeListeners) {
                        this.activeListeners[subType](parsedData.payload.event);
                    } else {
                        console.log("Handler Subscription type not found - " + subType);
                    }

                    break;

                case "revocation":
                    let revokedSubscription = parsedData.payload.subscription;
                    //TODO Optional Logging here
                    console.log(revokedSubscription.type + " subscription revoked. Reason - " + revokedSubscription.status);
                    break;
            }
        });
    }

    start() {
        //Do websocket things
        this.connect("wss://eventsub.wss.twitch.tv/ws");
    }

    stop() {
        this.ws?.close();
    }

    /**
     * Outputs a list of active subscriptions to track which are currently marked as "Active" 
     */
    getCurrentSubscriptions() {
        const options = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
                'Client-Id': this.TWITCH_CLIENT_ID
            }
        };

        fetch('https://api.twitch.tv/helix/eventsub/subscriptions?status=enabled', options).then(response => {
            if (!response.ok) {
                throw new Error("Error retrieving subscriptions - " + response.status);
            } else {
                response.json().then(response => {
                    console.log(response.data.length + " active subscriptions found.");

                    for (let i = 0; i < response.data.length; i++) {
                        console.log(response.data[i].type + " subscription is active");
                    }
                });
            }
        });
    }

    /**
     * 
     * @param subscriptionType - the type of event you want to subscribe to listen for e.g. "channel.follow"
     * More info found at - https://dev.twitch.tv/docs/api/reference#create-eventsub-subscription
     */
    private sendSubscriptionRequestToTwitch(subscriptionType: string) {
        //TODO Potential validation on the subscrtiptionType to ensure the user is requesting a 
        //valid (or already requested sub type).

        let body = `{"type":"${subscriptionType}","version":"1","condition":{"broadcaster_user_id":"${this.TWITCH_USER_ID}"},"transport":{"method":"websocket","session_id":"${this.TWITCH_SOCKET_ID}"}}`;

        if (subscriptionType == "channel.raid") {
            //NOTE This is hardcoded to only create subscriptions for raids coming to the channel
            body = `{"type":"${subscriptionType}","version":"1","condition":{"to_broadcaster_user_id":"${this.TWITCH_USER_ID}"},"transport":{"method":"websocket","session_id":"${this.TWITCH_SOCKET_ID}"}}`;
        }

        const options = {
            method: 'POST',
            body: body,
            headers: {
                Authorization: `Bearer ${this.TWITCH_ACCESS_TOKEN}`,
                'Client-Id': this.TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            }
        };

        fetch('https://api.twitch.tv/helix/eventsub/subscriptions', options).then(response => {
            if (!response.ok) {
                throw new Error("Error creating subscription - " + response.status);
            } else {
                //TODO Maybe do verbose logging of creating connections?
                console.log(subscriptionType + " subscription created");
            }
        });
    }

    /** Handler handlers.
    * 
    *   A suite of handlers for dealing with the various subscription types. 
    *   They are simple setters but each of them have their own related parameters 
    *   e.g. RewardRedemptionPayloadEvent
    * 
    *   These are convenience methods, for the most common use cases, if you require other eventsub events,
    *   check out the generic setEventSubHandler().
    */
    setOnChannelPointRewardRedeem(newHandler: (eventData: RewardRedemptionPayloadEvent) => void) {
        this.setEventSubHandler("channel.channel_points_custom_reward_redemption.add", newHandler);
    }

    setOnFollowEvent(newHandler: (eventData: FollowPayloadEvent) => void) {
        this.setEventSubHandler("channel.follow", newHandler);
    }

    setOnSubscribeEvent(newHandler: (eventData: SubscriptionPayloadEvent) => void) {
        this.setEventSubHandler("channel.subscribe", newHandler);
    }

    setOnRaidEvent(newHandler: (eventData: RaidPayloadEvent) => void) {
        this.setEventSubHandler("channel.raid", newHandler);
    }

    setOnCheerEvent(newHandler: (eventData: CheerPayloadEvent) => void) {
        this.setEventSubHandler("channel.cheer", newHandler);
    }

    setOnGiftSubscribeEvent(newHandler: (eventData: SubscriptionGiftPayloadEvent) => void) {
        this.setEventSubHandler("channel.subscription.gift", newHandler);
    }

    /**
     * A generic method of supplying an event handler to a given subscription type event
     * 
     * @param eventType - EventSub Subscription type
     * @param newHandler - event handler to trigger when given event is received on the socket.
     */
    setEventSubHandler<T extends BasicWebsocketPayloadEvent>(eventType: string, newHandler: (eventData: T) => void) {
        this.activeListeners[eventType] = newHandler;
    }
}

export {
    SubscriptionGiftPayloadEvent,
    CheerPayloadEvent,
    RaidPayloadEvent,
    SubscriptionPayloadEvent,
    RewardRedemptionPayloadReward,
    RewardRedemptionPayloadEvent,
    FollowPayloadEvent,
    Twocket
}
