// main file for the clip collector. When enabled, it will check to see if the link is a valid Twitch link and store
// that into a list of them. When the command to stop collecting those links goes through, it will then store them as hyperlinks
// that the streamer can click through in any order. Most likely will generate them as a local html page that auto-opens when 
// the command goes through, or some other file type that can store a link as a hyperlink. 
// In the future, maybe it will be stored on a personal page for an actual website and handle YT links also

const s = require('./asyncer.js');
const html = require('html');

class ClipCollector {

    #clip_list;
    #regexp_checker;//what we will use to verify that the link is a correct one
    #async_functions;//for verifying that the link is an actual clip

    constructor() {
        this.#clip_list = [];
        this.#regexp_checker = /^(?:(?:https?|http):\/\/)((clips.twitch.tv\/){1})/;
        this.#async_functions = new s(null, null);//wont be posting msgs, so no point in having valid client & target room
    }

    //whenever a clip is posted when !startcollect is enabled, it grabs the clip, verifies it's a valid format, 
    //verifies that the clip actually exists, and then stores it in a list of clips for safe keeping
    async validateAndStoreClipLink(client_id, access_token, url) {
        if (this.#regexp_checker.test(url)) {
            let clip_id = url.substring(24);
            let valid_link = await this.#async_functions.getClipInformation(client_id, access_token, clip_id);
            if (valid_link != "") {
                this.#clip_list.push(valid_link);
            }
        }
    }

    writeClipsToHTMLFile() {

    }



}

module.exports = ClipCollector;