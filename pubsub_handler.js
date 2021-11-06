import WebSocket from 'ws';

//a little class that will manage and handle our PubSubs and notifications coming from them
//this will be the main operator when dealing with the (eventual) chat-activated turret, as activating it will
//be done via a channel points redemption
export class PubSubHandler {

    #pubsub;//our WebSocket that we need to connect to the PubSub API
    #ping;//object we need to keep the connection for the PubSub open
    #twitch_chat_client;//handles posting of messages automatically/activating turret

    constructor(c) {
        this.#pubsub = new WebSocket('wss://pubsub-edge.twitch.tv');
        this.#ping = new Ping(this.#pubsub);
        this.#twitch_chat_client = c;

        //with the pubsub made, we can now get it working handling msgs
        this.start();
    }

    start() {
        //handler for closing and opening of the WebSocket
        this.#pubsub.on('close', () => {
            this.start();
        }).on('open', () => {
            this.#ping.start();
        });

        //when we get an actual message, we parse it with this lambda
        this.#pubsub.on('message', (data) => {
            let parsed_data = JSON.parse(data);

            switch (parsed_data.type) {
                case 'RECONNECT':
                    this.#pubsub.close();
                    break;
                case 'PONG':
                    this.#ping.pongGet();
                    break;
                case 'RESPONSE':
                    console.log(`RESPONSE: ${(parsed_data.error != '' ? parsed_data.error : 'OK')}`);
                    break;
                case 'MESSAGE':
                    console.log(parsed_data.data.message);
                    break;
                case 'reward-redeemed'://for the turret, we want the title of the reward (parsed_data.data.reward.title)
                    this.#rewardHandler(parsed_data);
                    console.log(parsed_data.data);
                    break;
                default:
                    console.log(parsed_data);
                    break;
            }
        });
    }

    //handler for all specially made, redeemed channel points rewards
    #rewardHandler(parsed_data) {
        switch (parsed_data.data.reward.title) {
            case '!timeout'://auto-timeout a viewer chosen by the redeemer
                const timeout_victim = parsed_data.data.user_input;
                const reward_redeemer = parsed_data.data.user.display_name;
                this.#twitch_chat_client.say('#pope_pontus', `@${timeout_victim} has been timed out by @${reward_redeemer}`);
                this.#twitch_chat_client.timeout('#pope_pontus', timeout_victim, 60, "You were chosen for a timeout");
                break;
            case 'VIP Me'://user redeemed reward to become a VIP
                const new_vip = parsed_data.data.user.display_name;
                this.#twitch_chat_client.say('#pope_pontus', `@${new_vip} has become a new VIP!`);
                this.#twitch_chat_client.say('#pope_pontus', `/vip ${new_vip}`);
                break;
        }
    }

    //from user input of the topic (assuming that the correct scopes are in the token)
    //send out a request to listen to a specific PubSub subscription
    requestToListen(topics, auth_token) {
        let req = {
            type: 'LISTEN',
            nonce: `pope_pontus-${new Date().getTime()}`,
            data: {
                topics: [topics],
                auth_token: auth_token,
            },
        };

        this.#pubsub.send(JSON.stringify(req));
    }
}

//class that will handle all ping-related issues with the PubSub listener. Will not be exposed to the user directly like
//PubSubHandler
class Ping {

    #pubsub;
    #pinger;//our interval message holder/timeout maker. Set as false for now
    #ping_timeout;//holds the timeout for the ping. If reached, send reconnect request to server

    constructor(ps) {
        this.#pubsub = ps;
        this.#pinger;
    }

    start() {
        if (this.#pinger) {
            clearInterval(this.#pinger);
        }
        this.sendPing();

        this.#pinger = setInterval(() => {
            setTimeout(() => {
                this.sendPing();
            }, Math.floor((Math.random() * 1000) + 1));
        }, (4*60*1000));
    }

    sendPing() {
        try {
            let pingus = { 'type': 'PING' };
            this.#pubsub.send(JSON.stringify(pingus));
            this.awaitPong();
        } catch (err) {
            console.error(err);
            this.#pubsub.close();
        }
    }

    awaitPong() {
        this.#ping_timeout = setTimeout(() => {
            console.log("WebSocket timeout");
            this.#pubsub.close();
        }, 10000);
    }

    pongGet() {
        clearTimeout(this.#ping_timeout);
    }

}

export default PubSubHandler;