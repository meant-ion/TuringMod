// main file for the clip collector. When enabled, it will check to see if the link is a valid Twitch link and store
// that into a list of them. When the command to stop collecting those links goes through, it will then store them as hyperlinks
// that the streamer can click through in any order. Most likely will generate them as a local html page that auto-opens when 
// the command goes through, or some other file type that can store a link as a hyperlink. 
// In the future, maybe it will be stored on a personal page for an actual website and handle YT links also

import fs from 'fs';
import TwitchAPI from './twitch_api.js';

export class ClipCollector {

    #valid_clip_regex;
    #twitch_api;

    /**
     * @param {TwitchAPI} twitch_api 
     */
    constructor(twitch_api) {
        this.#valid_clip_regex = /^(?:(?:https?|http):\/\/)((clips.twitch.tv\/){1})/;
        this.#twitch_api = twitch_api;
    }

    /**
     * determines correct format for clip link URL, and fetches/stores it if true
     * @param {string} url clip URL
     */
    async validateAndStoreClipLink(url) {
        //test the clip is in the correct format using the constructed regex
        if (this.#valid_clip_regex.test(url)) {
            const clip_id = url.substring(24);
            await this.#twitch_api.getClipInformation(clip_id);
        }
    }

    //when called, writes the list of collected twitch clips to file for the streamer's viewing
    writeClipsToHTMLFile() {
        let rtf_body = `<body>\n<div>\n<p>\n`;
        const list = this.#twitch_api.getClipList();

        for (let i = 0; i < list.length; ++i) rtf_body += list[i] + '\n';

        rtf_body += "</p>\n</div>\n</body>";

        fs.truncate('./data/clip_links.html', 0, () => 
            fs.writeFile('./data/clip_links.html', rtf_body, { flag: 'a+' }, err => { }));

    }

    // debug function, maybe useful at a point in the future
    dumpClipListToCLI() {
        const list = this.#twitch_api.getClipList();
        for (let i = 0; i < list.length; ++i) console.log(list[i]);
    }
}

export default ClipCollector;