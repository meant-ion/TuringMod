import { Twocket } from 'twocket';
import { writeFile, readFile } from 'fs'
// import banned_words from './../data/banned_words.json' assert { type: "json" };

export class EventSubs {
    #obs;                //for handling OBS related functions
    #vlc;                //for playing audio with controls
    #twok;               //library for communicating with EventSub API
    #twitch_api;         //for API functionality not a part of the EventSub API
    #helper;
    #client;
    #banned_words;
    topics_list = ['channel.raid', 'channel.channel_points_custom_reward_redemption.add', 'channel.ad_break.begin', /**'channel.chat.message'**/];

    //@param   o     The websocket connection for the turret cam
    //@param   v     The web controller for playing audio through VLC
    //@param   h     For the sleep and writeToFile functions
    //@param   t     Twitch API handler object
    constructor(o, v, h, t) {

        this.#obs = o;
        this.#vlc = v;
        this.#helper = h;
        this.#twitch_api = t;
        this.#readBannedWords();
    }

    start(user_id, client_id, access_token) {

        this.#twok = new Twocket(user_id, client_id, access_token, this.topics_list);
        this.#twok.start();

        this.#twok.setOnRaidEvent((data) => {
            this.#twitch_api.sendTimedShoutout(data.from_broadcaster_user_login, 'pope_pontius');
            this.#client.say('#pope_pontius', `Please check out and follow this cool dude here! https://www.twitch.tv/${data.from_broadcaster_user_login}`);
        });

        this.#twok.setEventSubHandler("channel.ad_break.begin", (_data) => {
            this.#warnAboutAds();
        });
    
        this.#twok.setOnChannelPointRewardRedeem((data) => {
            this.#reward_handler(data);
        });

    }

    set_chat_client(c) {
        this.#client = c;
    }

    get_banned_words() { 
        return Object.keys(this.#banned_words); 
    }

    async #warnAboutAds() {
        await this.#vlc.play_audio('ad warn.wav');
        await this.updateChannelRedemptionStatus();
        await this.#obs.ads_warning();
        await this.updateChannelRedemptionStatus();
        await this.#vlc.play_audio('ad done.wav');
    }

    async writeTimestampToFile() {
        const timecode = await this.#obs.getStreamTimestamp();
        this.#helper.writeToFile(`${this.#helper.getCurrentDate}: ${timecode}`, './data/vod_timestamps.txt');
    }

    async updateChannelRedemptionStatus() {
        const reward_names = ['Australia', 'Barrel Roll', 'Wide Pope', 'Long Pope', 'Bonk', 'Screen Saver Camera'];

        for await (const names of reward_names) {
            await this.#twitch_api.setRedemptionStatus(names);
        }
    }

    async #readBannedWords() {
        readFile('./data/banned_words.json', (err, data) => {
            if (err) console.error(err); 
            else this.#banned_words = JSON.parse(data);
        });
    }

    async #addBannedWord(word, user_name) {
        let validation = word.split(" ");
        if (validation.length <= 1) {
            let today = new Date();
            let banned_date = String(String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getDate()).padStart(2, '0') + '/' + today.getFullYear();
            this.#banned_words[word] = banned_date;
            writeFile('./data/banned_words.json', JSON.stringify(this.#banned_words, null, 4), (err) => {
                if (err) { console.error(err); }
                else console.log("* Banned word added!");
            });
        } else {
            this.#client.say("#pope_pontius", `@${user_name} only one word can be banned! Ask a mod to refund you`);
        }
    }

    async #reward_handler(parsed_data) {

        switch(parsed_data.reward.title) {
            case 'Screen Saver Camera':
                await this.#obs.DVD_Screensaver();
                break;
            case 'Bonk':
                await this.#vlc.play_audio('bonk.wav');
                await this.#obs.bonk_squish();
                await this.#vlc.empty_playlist();
                break;
            case 'Australia':
                await this.#obs.australia();
                break;
            case 'Wide Pope':
                await this.#obs.warp_facecam(true);
                break;
            case 'Long Pope':
                await this.#obs.warp_facecam(false);
                break;
            case 'Barrel Roll':
                await this.#obs.barrel_roll();
                break;
            case 'Ban A Word':
                await this.#addBannedWord(parsed_data.user_input, parsed_data.user_name);
                break;
            case 'Jumpscare':
                await this.#vlc.play_audio(`jumpscare_${Math.floor(Math.random() * (5-1+1) + 1)}.mp3`);
                await this.#helper.sleep(2000);
                await this.#vlc.empty_playlist();
                break;
            case 'American Jumpscare':
                await this.#vlc.play_audio('gunshot.mp3');
                await this.#helper.sleep(2000);
                await this.#vlc.empty_playlist();
                break;
        }

    }

}

export default EventSubs;