import { ClientCredentialsAuthProvider } from "@twurple/auth";
import { ApiClient } from "@twurple/api";
import { EventSubListener } from "@twurple/eventsub";
import { NgrokAdapter } from "@twurple/eventsub-ngrok";

//class that will handle the EventSub API from twitch
//Holds for functions such as automating the raid message posting in the chatroom, etc.
//note to self: need someone to actually raid me to see if this works as intended
export class EventSubHandler {

    #twitch_client;//the IRC client for the channel's chat room
    #channel_raided;//the listener for the automatic raid msg post

    constructor(db, client) {
        this.#twitch_client = client;
        this.buildEventSubHandler(db);
    }

    async buildEventSubHandler(db) {
        
        const twitch_info = await db.getIdAndSecret();
        const client_id = twitch_info[0];
        const client_secret = twitch_info[1];

        //build the listener and its components so we can do the one thing necessary for this
        const auth_provider = new ClientCredentialsAuthProvider(client_id, client_secret);
        const api_client = new ApiClient({authProvider: auth_provider});
        const secret = `pope_pontus-${new Date().getTime()}`;
        const listener = new EventSubListener({
            apiClient: api_client,
            adapter: new NgrokAdapter(),
            secret: secret
        });
        
        //automatically posts the raid msg to the chatroom
        try {
            this.#channel_raided = await listener.subscribeToChannelRaidEventsTo('71631229', e => {
                this.#twitch_client.say('#pope_pontus', `Please check out and follow this cool dude here! https://www.twitch.tv/${e.raidingBroadcasterName}`);
            });
        } catch (err) { console.error(err); }


        await listener.listen();
    }

    //shuts down the listener when the bot is given a shutdown message
    async shutdown() { await this.#channel_raided.stop(); }

}

export default EventSubHandler;