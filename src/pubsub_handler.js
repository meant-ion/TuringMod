import WebSocket from 'ws';
import SerialPort from 'serialport';
import pkg from '@serialport/parser-readline';
import UberAPI from './ubertts.js';
const { Readline } = pkg;
//importing otherwise literally does not work for me, forgive me coding gods


//a little class that will manage and handle our PubSubs and notifications coming from them
//this will be the main operator when dealing with the (eventual) chat-activated turret, as activating it will
//be done via a channel points redemption
export class PubSubHandler {

    #pubsub;             //our WebSocket that we need to connect to the PubSub API
    #ping;               //object we need to keep the connection for the PubSub open
    #twitch_chat_client; //handles posting of messages automatically/activating turret
    #topics_list;        //an array holding the topics we are listening to with the bot
    #port;               //the serial port we will use to communicate with the rpi's turret
    #parser;             //what we will use for processing communications between the arduino and the rpi
    #twitch_api;         //object for handling all API requests to Twitch
    #tts_api;            //object for handling Uberduck API requests/playing
    #obs;                //for handling OBS related functions
    #vlc;                //for playing audio with controls

    //@param   c     The Twitch Chat IRC client we need to send messages through
    //@param   t_a   The twitch_api object
    //@param   c_h   The database for the UberDuck API
    //@param   o     The websocket connection for the turret cam
    //@param   v     The web controller for playing audio through VLC
    constructor(c, t_a, c_h, o, v) {
        this.#pubsub = new WebSocket('wss://pubsub-edge.twitch.tv');
        this.#ping = new Ping(this.#pubsub);

        this.#obs = o;

        this.#twitch_chat_client = c;
        this.#topics_list = []; 
        //this.#port = new SerialPort('COM4', {baudRate: 9600});
        //this.#parser = this.#port.pipe(new pkg({ delimeter: '\n'}));

        //this.#port.on("open", () => console.log("* Serial Port to Turret Open"));
        this.#twitch_api = t_a;
        this.#vlc = v;
        this.#tts_api = new UberAPI(c_h, v);
        

        //with the pubsub made, we can now get it working handling msgs
        this.start();
    }

    //starts up execution and listening for the WebSocket
    start() {
        //handler for closing and opening of the WebSocket
        this.#pubsub.on('close', () => this.start())
        .on('open', () => this.#ping.start());

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
                    console.log(`* RESPONSE: ${(parsed_data.error != '' ? parsed_data.error : 'OK')}`);
                    break;
                case 'MESSAGE':
                    let truly_parsed_data = JSON.parse(parsed_data.data.message);
                    if (truly_parsed_data.type  == 'reward-redeemed') this.#rewardHandler(truly_parsed_data);
                    break;
                default:
                    console.log(parsed_data);
                    break;
            }
        });
    }

    //handler for all specially made, redeemed channel points rewards
    //@param   parsed_data   The bulk of the data received from the WebSocket
    async #rewardHandler(parsed_data) {
        switch (parsed_data.data.redemption.reward.title) {
            case 'FIRE!'://user redeemed firing off the nerf turret. Need to completely implement turret functionality first
                //when command from chat received, write the command to the arduino via serial connection
                try {
                    // await this.#obs.call('SetCurrentProgramScene', {sceneName: 'Turret Cam'});
                    // this.#port.write("f", (err) => {
                    //     if (err) return console.error(err);
                    //     console.log("* Fire command sent out!");
                    // });
                } catch(err) { console.error(err); }
                break;
            case 'AI Speech': 
                const user_str = parsed_data.data.redemption.user_input;
                await this.#tts_api.generate_tts_speech(user_str);
                await this.#vlc.empty_playlist();
                break;
            case 'Screen Saver Camera':
                await this.#obs.DVD_Screensaver();
                break;
            case 'Bonk':
                await this.#vlc.play_audio('bonk.wav');
                await this.#obs.bonk_squish();
                await this.#vlc.empty_playlist();
                break;
        }
    }

    //from user input of the topic (assuming that the correct scopes are in the token)
    //send out a request to listen to a specific PubSub subscription
    //@param   topic        The topic we wish to listen to/stop listening to
    //@param   auth_token   Token we need to send out these requests
    requestToListen(topics, auth_token) {
        const req = {
            type: 'LISTEN',
            nonce: `pope_pontius-${new Date().getTime()}`,
            data: {
                topics: [topics],
                auth_token: auth_token,
            },
        };

        this.#topics_list.push(topics);

        this.#pubsub.send(JSON.stringify(req));
    }

    //when called, unlistens to all pubsubs we have listened to and stops the WebSocket executing. 
    //only called when a shutdown command is read by the bot
    killAllSubs(auth_token) {
        this.#topics_list.forEach(topic => {
            let req = this.#makeReq(topic, auth_token, false);
            this.#topics_list.pop();
            this.#pubsub.send(JSON.stringify(req));
        });
    }

    //makes the PubSub request; can be used to listen to a topic or stop listening to a topic
    //@param   topic        The topic we wish to listen to/stop listening to
    //@param   auth_token   Token we need to send out these requests
    //@param   is_listen    Tells us if we want to start listening to (true) or stop listening to (false) a topic
    //@returns              A request object for the PubSub WebSocket
    #makeReq(topic, auth_token, is_listen) {
        const _type = is_listen ? 'LISTEN' : 'UNLISTEN';
        return {
            type: _type,
            nonce: `pope_pontius-${new Date().getTime()}`,
            data: {
                topics: [topic],
                auth_token: auth_token
            }
        }
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

    //starts up the ping timer
    start() {
        if (this.#pinger) clearInterval(this.#pinger);
        this.sendPing();

        this.#pinger = setInterval(() => {
            setTimeout(() => this.sendPing(), Math.floor((Math.random() * 1000) + 1));
        }, (4*60*1000));
    }

    //sends out a ping message to the PubSub API
    sendPing() {
        try {
            const pingus = { 'type': 'PING' };
            this.#pubsub.send(JSON.stringify(pingus));
            this.awaitPong();
        } catch (err) {
            console.error(err);
            this.#pubsub.close();
        }
    }

    //listener for the pong message from the PubSub API
    awaitPong() { this.#ping_timeout = setTimeout(() => { this.#pubsub.close(); }, 10000); }

    //called when we get the pong message, so we get rid of the ping response timer
    pongGet() { clearTimeout(this.#ping_timeout); }

}

export default PubSubHandler;