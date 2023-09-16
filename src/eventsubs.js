import SerialPort from 'serialport';
import pkg from '@serialport/parser-readline';
import UberAPI from './ubertts.js';
import { Twocket } from 'twocket';
const { Readline } = pkg;

export class EventSubs {

    #tts_api;            //object for handling Uberduck API requests/playing
    #obs;                //for handling OBS related functions
    #vlc;                //for playing audio with controls
    #port;               //the serial port we will use to communicate with the rpi's turret
    #parser;             //what we will use for processing communications between the arduino and the computer
    #twok;               //library for communicating with EventSub API
    #twitch_api;         //for API functionality not a part of the EventSub API
    #client;
    topics_list = ['channel.raid', 'channel.channel_points_custom_reward_redemption.add'];

    //@param   c_h   The database for the UberDuck API
    //@param   o     The websocket connection for the turret cam
    //@param   v     The web controller for playing audio through VLC
    //@param   h     For the sleep function
    //@param   t     Twitch API handler object
    constructor(c_h, o, v, h, t) {

        //this.#port = new SerialPort('COM4', {baudRate: 9600});
        //this.#parser = this.#port.pipe(new pkg({ delimeter: '\n'}));

        //this.#port.on("open", () => console.log("* Serial Port to Turret Open"));
        this.#obs = o;
        this.#vlc = v;
        this.#tts_api = new UberAPI(c_h, v, h);
        this.#twitch_api = t;

    }

    start(user_id, client_id, access_token) {

        this.#twok = new Twocket(user_id,client_id, access_token, this.topics_list);
        this.#twok.start();

        this.#twok.setOnRaidEvent((data) => {
            // this.#client.say(target, `/shoutout ${data.event.from_broadcaster_user_login}`);
            this.#twitch_api.sendShoutout(data.from_broadcaster_user_login, 'pope_pontius');
            this.#client.say('#pope_pontius', `Please check out and follow this cool dude here! https://www.twitch.tv/${data.from_broadcaster_user_login}`);
        });
    
        this.#twok.setOnChannelPointRewardRedeem((data) => {
            this.#reward_handler(data);
        });

    }

    set_chat_client(c) {
        this.#client = c;
    }

    async #reward_handler(parsed_data) {

        switch(parsed_data.reward.title) {
            case 'AI Speech': 
                const user_str = parsed_data.user_input;
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
            case 'Australia':
                await this.#obs.australia();
                break;
            case 'Wide Pope':
                await this.#obs.warp_facecam(true);
                break;
            case 'Long Pope':
                await this.#obs.warp_facecam(false);
                break;
        }

    }

}

export default EventSubs;