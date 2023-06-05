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

    topics_list = ['channel.raid', 'channel.channel_points_custom_reward_redemption.add'];

    //@param   c_h   The database for the UberDuck API
    //@param   o     The websocket connection for the turret cam
    //@param   v     The web controller for playing audio through VLC
    //@param   h     For the sleep function
    //@param   c_d   client data for making a twocket object
    //@param   tok   API token for EventSub API
    //@param   t     Twitch API handler object
    constructor(c_h, o, v, h, c_d, tok, t) {

        //this.#port = new SerialPort('COM4', {baudRate: 9600});
        //this.#parser = this.#port.pipe(new pkg({ delimeter: '\n'}));

        //this.#port.on("open", () => console.log("* Serial Port to Turret Open"));
        this.#obs = o;
        this.#vlc = v;
        this.#tts_api = new UberAPI(c_h, v, h);
        this.#twitch_api = t;

        this.#twok = new Twocket('71631229',c_d[0],tok,this.topics_list);
        this.#twok.start();

        this.#twok.setOnRaidEvent((data) => {
            client.say(target, `/shoutout ${data.event.from_broadcaster_user_login}`);
            client.say(target, `Please check out and follow this cool dude here! https://www.twitch.tv/${data.event.from_broadcaster_user_login}`);
        });

    }
    
}

export default EventSubs;