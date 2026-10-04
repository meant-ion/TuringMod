import {SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import OBSAnimations from './obs_anims.js';
import TwitchAPI from './twitch_api.js';
import { Client } from 'tmi.js';

export class ArduinoController {

    #port;
    #parser;
    #obs;
    #helper;
    #twitch_api;
    #client;

    /**
     * @param {OBSAnimations} o OBS animations handler
     * @param {Helper} h helper functions object
     * @param {TwitchAPI} t twitch API handler object
     * @param {Client} c twitch chat client
     */
    constructor(o, h, t, c) {
        this.#port = new SerialPort({path:'COM7',baudRate:9600});
        this.#parser = this.#port.pipe(new ReadlineParser({ delimeter: '\n'}));
        this.#parser.on('data', (data) => this.#parseCommand(data));
        this.#port.on("open", () => console.log("* Serial Port to Arduino Open!"));

        this.#obs = o;
        this.#helper = h;
        this.#twitch_api = t;
        this.#client = c;
    }

    /**
     * @param {string} data command we're getting from the arduino
     */
    async #parseCommand(data) {
        switch(data) {
            case "Clip":
                await this.writeTimestampToFile();
                break;
            case "WAVE DONE":
                await this.#obs.changeCurrentScene('4k Scene');
                break;
        }
    }

    /**
     * @param {string} cmd arduino command string
     */
    sendCommand(cmd) {
        this.#port.write(cmd);
    }

    async writeTimestampToFile() {
        const timecode = await this.#obs.getStreamTimestamp();
        const date = this.#helper.getCurrentDate();

        const createTime = `${date}: ${timecode}`;
        // top method is functional, having issues getting API call method to work as expected
        this.#helper.writeToFile(createTime, './data/vod_timestamps.txt', false);
        try {
            await this.#twitch_api.setStreamMarker();
            this.#client.say('#pope_pontius', `Stream marker created at ${createTime}`);
        } catch (err) {
            console.error(err);
        }

    }

}

export default ArduinoController;