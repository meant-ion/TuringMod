import {SerialPort} from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

export class ArduinoController {

    #port;
    #parser;
    #obs;
    #helper;

    constructor(o, h) {
        this.#port = new SerialPort({path:'COM7',baudRate:9600});
        this.#parser = this.#port.pipe(new ReadlineParser({ delimeter: '\n'}));
        this.#parser.on('data', (data) => this.#parseCommand(data));
        this.#port.on("open", () => console.log("* Serial Port to Arduino Open!"));

        this.#obs = o;
        this.#helper = h;
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
        this.#helper.writeToFile(`${this.#helper.getCurrentDate}: ${timecode}`, './data/vod_timestamps.txt')
    }

}

export default ArduinoController;