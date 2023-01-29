import fs from 'fs';
import https from 'https';
import fetch from 'node-fetch';

//Generates an audio file of an AI TTS model from Uberduck AI saying chat-defined messages
export class UberAPI {

    #db
    #vlc //for playing audio

    //@param   c_h   The database containing the key and secret for the UberDuck API
    //@param   v     For playing the TTS audio through VLC
    constructor(c_h, v) {

        this.#db = c_h;
        this.#vlc = v;

    }

    //Encodes the basic authentication to Base64 from the key and secret
    //@returns   A Base64 encoded string for basic authentication
    async #make_encoded_auth() {
        const pair = await this.#db.getUberduckInfo();
        return Buffer.from(`${pair[1]}:${pair[0]}`).toString('base64');;
    }


    //@param   script   The message the chat member sent when redeeming the channel points reward and what voice they want
    async generate_tts_speech(script) {

        //separate what model(s) the chat member wants and what they want said
        let split_script = script.split(':');

        let actors = [];
        let scripts = [];
        if (split_script.length == 1) {//only one actor, actor not specified
            actors.push("heavy");
            scripts.push(split_script[0]);
        } else if (split_script.length == 2) {//only one actor, actor is specified
            actors.push(split_script[0]);
            scripts.push(split_script[1]);
        } else {//multiple actors, need to process to get list correct
            actors.push(split_script[0]);
            for (let i = 1; i < split_script.length; ++i) {
                if (i == split_script.length - 1) {//last line, no actor attached
                    if (split_script[split_script.length-1][0] == ' ') {
                        scripts.push(split_script[split_script.length-1].slice(1));
                    } else {
                        scripts.push(split_script[split_script.length-1]);
                    }
                    break;
                }

                let line = split_script[i].split(' ');
                let actor = line[line.length - 1];
                actors.push(actor);
                scripts.push(split_script[i].slice(0, -actor.length).slice(1));
            }
        }

        const uberduck_url = "https://api.uberduck.ai/speak";

        const auth = await this.#make_encoded_auth();

        //first API call to put job into queue, will get back uuid needed for next call
        for (let i = 0; i < actors.length; ++i) {
            let job_header = {
                "method": "POST",
                "headers": {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'uberduck-id': 'pope_pontius'
                },
                'body': JSON.stringify({
                    'pace': 1,
                    'voice': actors[i],
                    'speech': scripts[i]
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
                    this.#vlc.play_audio('audio.wav');
                });

            }).on("error", (err) => console.error(err));
        }
    }

}

export default UberAPI;