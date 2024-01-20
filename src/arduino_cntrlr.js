import {SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

export class ArduinoController {

    #port;
    #parser;
    #obs;
    #helper;
    #twitch_api;
    #client;
    #discord_client;

    constructor(o, h, t, c, d_c) {
        this.#port = new SerialPort({path:'COM7',baudRate:9600});
        this.#parser = this.#port.pipe(new ReadlineParser({ delimeter: '\n'}));
        this.#parser.on('data', (data) => this.#parseCommand(data));
        this.#port.on("open", () => console.log("* Serial Port to Arduino Open!"));

        this.#obs = o;
        this.#helper = h;
        this.#twitch_api = t;
        this.#client = c;
        this.#discord_client = d_c;
    }

    async #parseCommand(data) {
        switch(data) {
            case "Clip":
                await this.writeTimestampToFile();
                break;
        }
    }

    async writeTimestampToFile() {
        const timecode = await this.#obs.getStreamTimestamp();
        const date = this.#helper.getCurrentDate();

        //trying a few different methods to see which one works the best for me
        this.#helper.writeToFile(`${date}: ${timecode}`, './data/vod_timestamps.txt', false);
        let clip_url = await this.#twitch_api.createClip();
        this.#client.say('#pope_pontius', clip_url);

        this.#discord_client.channels.cache.get(process.env.CHANNEL_ID).send(clip_url);
    }

}

export default ArduinoController;