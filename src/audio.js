import * as VLC from 'vlc-client';
import path from 'path';

export class AudioPlayer {

    #vlc

    constructor() {
        this.#vlc = new VLC.Client({
            ip: "localhost",
            port: 8080,
            password: "password"
        });
    }

    async play_audio(filename) {
        await this.check_playlist();
        let filepath = path.resolve('./src/audio/' + filename);

        await this.#vlc.setVolume(50);

        await this.#vlc.playFile(filepath);   
    }

    async kill_audio() {
        if (await this.#vlc.isPlaying()) await this.#vlc.stop();
    }

    async empty_playlist() {
        await this.#vlc.emptyPlaylist();
    }

    async check_playlist() {
        if ((await this.#vlc.getPlaylist()).length > 0) await this.empty_playlist();
    }

}

export default AudioPlayer;

