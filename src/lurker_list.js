// holds the classes necessary to make the lurker list for the !lurk and !unlurk commands

import Helper from './helper.js';

export class LurkList {

    //the list that will hold all lurkers in the chatroom. Lurkers are added with the !lurk command and removed with the 
    //!unlurk command. Firing off the !unlurk command will return from here how long the lurker has been lurking for 

    #lurker_list;
    helper;

    /**
     * @param {Helper} helper 
     */
    constructor(helper) {
        this.#lurker_list = {};
        this.helper = helper;
    }

    /**
     * Adds a lurker to the list of lurkers and records their last message
     * @param {string} user username
     * @param {string} msg last said message 
     * @returns {string} either a "see ya" or message saying they're already lurking
     */
    addLurker(user, msg) {
        if (this.#lurker_list[user] == undefined) {
            const new_user = [];
            new_user.push(new Date());
            new_user.push(this.helper.combineInput(msg, true));
            this.#lurker_list[user] = new_user;
            return `See you whenever you get back @${user}`;
        }
        return `You're already lurking @${user}`
    }

    /**
     * finds the user in lurker_list if there, removes them from the list, and returns a string containing the amount of time
     * they were gone for. 
     * @param {string} user username
     * @param {boolean} is_leaving 
     * @returns {string} either last message before lurking or message saying they never lurked in the first place
     */
    removeLurker(user, is_leaving) {
        if (this.#lurker_list[user] != undefined) {

            const time_msg = this.helper.getTimePassed(this.#lurker_list[user][0], false);
            const lurk_msg = this.#lurker_list[user][1];
            const msg = is_leaving ? `Goodbye for now @${user}! See you later!` : 
                    `Welcome back @${user}! You were gone for ${time_msg} because of "${lurk_msg == '!lurk' ? 
                    "No Message Provided" : lurk_msg}"`;
            delete this.#lurker_list[user];
            return msg;
        }
        //user wasn't already lurking
        return `You needed to be lurking already in order to stop lurking @${user}`;
    }

}

export default LurkList;