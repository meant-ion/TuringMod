import fs from 'fs';
import https from 'https';
import {PythonShell} from 'python-shell';
import fetch from 'node-fetch';

//Generates an audio file of an AI TTS model from Uberduck AI saying chat-defined messages
export class UberAPI {

    #db

    //@param   c_h   The database containing the key and secret for the UberDuck API
    constructor(c_h) {

        this.#db = c_h;

    }

    //Encodes the basic authentication to Base64 from the key and secret
    //@returns   A Base64 encoded string for basic authentication
    async #make_encoded_auth() {
        const pair = await this.#db.getUberduckInfo();
        return Buffer.from(`${pair[1]}:${pair[0]}`).toString('base64');;
    }


    //@param   script   The message the chat member sent when redeeming the channel points reward and what voice they want
    async generate_tts_speech(script) {

        //separate what model the chat member wants and what they want said
        let split_script = script.split(/:(.*)/s);

        //quick check to see if there's no voice defined by the user
        if (split_script.length == 1) {
            let temp = split_script[0];
            split_script[0] = "heavy"; //TF2 Heavy voice
            split_script.push(temp);
        }

        const uberduck_url = "https://api.uberduck.ai/speak";

        const auth = await this.#make_encoded_auth();

        //first API call to put job into queue, will get back uuid needed for next call
        const job_header = {
            "method": "POST",
            "headers": {
                'Accept': 'application/json',
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'uberduck-id': 'pope_pontius'
            },
            'body': JSON.stringify({
                'pace': 1,
                'voice': split_script[0],
                'speech': split_script[1]
            })
        };

        let uuid = '';

        try {

            await fetch(uberduck_url, job_header).then(result => result.json()).then(body => {
                uuid = body.uuid;
            });

        } catch (err) {
            console.error(err);
            return '';
        }

        const status_url = `https://api.uberduck.ai/speak-status?uuid=${uuid}`;

        const status_header = {
            "method": "GET",
            "headers": {
              'Accept': 'application/json'
            }
        };

        //for easier error checking and conditionals
        let output = {
            "failed_at": null,
            "finished_at": null,
            "path": null
        }

        //second call gets the url for downloading the audio file
        try {

            while (output.finished_at == null && output.path == null) {

                await fetch(status_url, status_header).then(result => result.json()).then(body => {
                    output.failed_at = body.failed_at;
                    output.finished_at = body.finished_at;
                    output.path = body.path;
                });

            }

        } catch (err) {
            console.error(err);
            return '';
        }

        // now we download the file from the url given in the second call
        https.get(output.path, (res) => {

            const file = fs.createWriteStream(`./src/audio/audio.wav`);

            res.pipe(file);

            //file finished downloading, now we send it to python script to play
            file.on('finish', () => {
                file.close();

                PythonShell.run('./src/audio/audio.py', {
                    pythonPath: 'C:/Program Files/Python310/python.exe',
                    args: ["audio.wav"]
                }, err => {
                    if (err) console.error(err);
                });
            });

        }).on("error", (err) => console.error(err));

    }

}

export default UberAPI;