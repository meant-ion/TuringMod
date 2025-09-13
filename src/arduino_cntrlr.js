import {SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

export class ArduinoController {

    #port;
    #parser;
    #obs;
    #helper;
    #twitch_api;
    #client;

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

    sendCommand(cmd) {
        this.#port.write(cmd);
    }

    async writeTimestampToFile() {
        const timecode = await this.#obs.getStreamTimestamp();
        const date = this.#helper.getCurrentDate();

        const createTime = `${date}: ${timecode}`;
        //trying a few different methods to see which one works the best for me
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