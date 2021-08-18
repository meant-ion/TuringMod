// main file for the clip collector. When enabled, it will check to see if the link is a valid Twitch link and store
// that into a list of them. When the command to stop collecting those links goes through, it will then store them as hyperlinks
// that the streamer can click through in any order. Most likely will generate them as a local html page that auto-opens when 
// the command goes through, or some other file type that can store a link as a hyperlink. 
// In the future, maybe it will be stored on a personal page for an actual website and handle YT links also

const s = require('./asyncer.js');
const fs = require('fs');

class ClipCollector {

    #regexp_checker;//what we will use to verify that the link is a correct one
    #async_functions;//for verifying that the link is an actual clip

    constructor() {
        this.#regexp_checker = /^(?:(?:https?|http):\/\/)((clips.twitch.tv\/){1})/;
        this.#async_functions = new s(null, null);//wont be posting msgs, so no point in having valid client & target room
    }

    //whenever a clip is posted when !startcollect is enabled, it grabs the clip, verifies it's a valid format, 
    //verifies that the clip actually exists, and then stores it in a list of clips for safe keeping
    async validateAndStoreClipLink(client_id, access_token, url) {
        if (this.#regexp_checker.test(url)) {
            let clip_id = url.substring(24);
            await this.#async_functions.getClipInformation(client_id, access_token, clip_id);
            console.log("item stored");
        }
    }

    //when called, writes the list of collected twitch clips to file for the streamer's viewing
    //currently just does this with a .txt file, hope to be able to get this onto an actual html file
    //so that the links are actually hyperlinks and they dont have to be copy/pasted to see them
    writeClipsToHTMLFile() {
        let rtf_body = `<body>\n<div>\n<p>\n`
        let list = this.#async_functions.getClipList();

        for (var i = 0; i < list.length; ++i) {
            rtf_body += list[i] + '\n';
        }

        rtf_body += "</p>\n</div>\n</body>";

        fs.truncate('./data/clip_links.html', 0, function () {
            fs.writeFile('./data/clip_links.html', rtf_body,
                { flag: 'a+' }, err => { });
        });

        //console.log(rtf_body);

        //htmlToRtf.saveRtfInFile('./data/clip_links.rtf', htmlToRtf.convertHtmlToRtf(rtf_body));
    }

    //simple function that dumps the list of clips to console
    //really just a debug function, but maybe useful somewhere else?
    dumpClipListToCLI() {
        let list = this.#async_functions.getClipList();
        for (var i = 0; i < list.length; ++i) {
            console.log(list[i]);
        }
    }
}

module.exports = ClipCollector;