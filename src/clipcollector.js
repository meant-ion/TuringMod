// main file for the clip collector. When enabled, it will check to see if the link is a valid Twitch link and store
// that into a list of them. When the command to stop collecting those links goes through, it will then store them as hyperlinks
// that the streamer can click through in any order. Most likely will generate them as a local html page that auto-opens when 
// the command goes through, or some other file type that can store a link as a hyperlink. 
// In the future, maybe it will be stored on a personal page for an actual website and handle YT links also

import fs from 'fs';

export class ClipCollector {

    #regexp_checker;//what we will use to verify that the link is a correct one
    #async_functions;//for verifying that the link is an actual clip

    constructor(async_functions) {
        this.#regexp_checker = /^(?:(?:https?|http):\/\/)((clips.twitch.tv\/){1})/;
        this.#async_functions = async_functions;
    }

    //whenever a clip is posted when !startcollect is enabled, it grabs the clip, verifies it's a valid format, 
    //verifies that the clip actually exists, and then stores it in a list of clips for safe keeping
    //@param   async_obj   The async_functions object we will use to get info on the clips
    //@param   url         The URL of the clip we need to get info on/validate as a clip
    async validateAndStoreClipLink(async_obj, url) {
        //test the clip is in the correct format using the constructed regex
        if (this.#regexp_checker.test(url)) {
            let clip_id = url.substring(24);
            await async_obj.getClipInformation(clip_id);
        }
    }

    //when called, writes the list of collected twitch clips to file for the streamer's viewing
    //currently just does this with a .txt file, hope to be able to get this onto an actual html file
    //so that the links are actually hyperlinks and they dont have to be copy/pasted to see them
    writeClipsToHTMLFile() {
        //start building the basic body for the HTML page and get the clips
        let rtf_body = `<body>\n<div>\n<p>\n`
        let list = this.#async_functions.getClipList();

        //add in the clips to the HTML page
        for (let i = 0; i < list.length; ++i) rtf_body += list[i] + '\n';

        //add in the end tags for all HTML elements
        rtf_body += "</p>\n</div>\n</body>";

        //write the new HTML page to file
        fs.truncate('./data/clip_links.html', 0, function () {
            fs.writeFile('./data/clip_links.html', rtf_body,
                { flag: 'a+' }, err => { });
        });

    }

    //simple function that dumps the list of clips to console
    //really just a debug function, but maybe useful somewhere else?
    dumpClipListToCLI() {
        let list = this.#async_functions.getClipList();
        for (let i = 0; i < list.length; ++i) console.log(list[i]);
    }
}

export default ClipCollector;