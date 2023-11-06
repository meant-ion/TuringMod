import SerialPort from 'serialport';
import pkg from '@serialport/parser-readline';
const { ReadlineParser } = pkg;
import UberAPI from './ubertts.js';
import { Twocket } from 'twocket';

export class EventSubs {

    #tts_api;            //object for handling Uberduck API requests/playing
    #obs;                //for handling OBS related functions
    #vlc;                //for playing audio with controls
    #port;               //the serial port we will use to communicate with the rpi
    #parser;             //what we will use for processing communications between the arduino and the computer
    #twok;               //library for communicating with EventSub API
    #twitch_api;         //for API functionality not a part of the EventSub API
    #helper;
    #client;
    topics_list = ['channel.raid', 'channel.channel_points_custom_reward_redemption.add'];

    //@param   c_h   The database for the UberDuck API
    //@param   o     The websocket connection for the turret cam
    //@param   v     The web controller for playing audio through VLC
    //@param   h     For the sleep and writeToFile functions
    //@param   t     Twitch API handler object
    constructor(c_h, o, v, h, t) {
        // arduino communications
        this.#port = new SerialPort('COM7', {baudRate:9600});
        this.#parser = this.#port.pipe(new pkg({ delimeter: '\n'}));
        this.#parser.on('data', (data) => console.log(data));
        this.#port.on("open", () => console.log("* Serial Port to Arduino Open!"));

        this.#obs = o;
        this.#vlc = v;
        this.#helper = h;
        this.#tts_api = new UberAPI(c_h, v, h);
        this.#twitch_api = t;

    }

    start(user_id, client_id, access_token) {

        this.#twok = new Twocket(user_id,client_id, access_token, this.topics_list);
        this.#twok.start();

        this.#twok.setOnRaidEvent((data) => {
            this.#twitch_api.sendShoutout(data.from_broadcaster_user_login, 'pope_pontius');
            this.#client.say('#pope_pontius', `Please check out and follow this cool dude here! https://www.twitch.tv/${data.from_broadcaster_user_login}`);
            this.#obs.copypasta_animation();
        });
    
        this.#twok.setOnChannelPointRewardRedeem((data) => {
            this.#reward_handler(data);
        });

    }

    set_chat_client(c) {
        this.#client = c;
    }

    async writeTimestampToFile() {
        const timecode = await this.#obs.getStreamTimestamp();
        this.#helper.writeToFile(`${this.#helper.getCurrentDate}: ${timecode}`, './data/vod_timestamps.txt')
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
            case 'Barrel Roll':
                await this.#obs.barrel_roll();
                break;
        }

    }

}

export default EventSubs;