// holds the classes necessary to make the lurker list for the !lurk and !unlurk commands

import Helper from './helper.js';

export class LurkList {

    //the list that will hold all lurkers in the chatroom. Lurkers are added with the !lurk command and removed with the 
    //!unlurk command. Firing off the !unlurk command will return from here how long the lurker has been lurking for 

    #lurker_list;
    helper = new Helper();

    constructor() {
        this.#lurker_list = {};
    }

    //Adds a lurker to the list of lurkers and records their last message
    //@param   user   Who we're adding to the list
    //@param   msg    What the last message they said was
    //@return         Either a "see ya" message or a message telling them they're already lurking
    addLurker(user, msg) {
        if (this.#lurker_list[user.username] == undefined) {
            const new_user = [];
            new_user.push(new Date());
            new_user.push(this.helper.combineInput(msg, true));
            this.#lurker_list[user.username] = new_user;
            return `See you whenever you get back @${user.username}`;
        }
        return `You're already lurking @${user.username}`
    }

    //finds the user in lurker_list if there, removes them from the list, and returns a string containing the amount of time
    //they were gone for. 
    //@param   user         Who we're removing in the lurker list
    //@param   is_leaving   Boolean to tell us if the command was !leave or not
    //@return               Either the last message they said, or a message telling them they never !lurk'd in the first place
    removeLurker(user, is_leaving) {
        if (this.#lurker_list[user.username] != undefined) {

            const time_msg = this.helper.getTimePassed(this.#lurker_list[user.username][0], false);
            const lurk_msg = this.#lurker_list[user.username][1];
            const msg = is_leaving ? `Goodbye for now @${user.username}! See you later!` : 
                    `Welcome back @${user.username}! You were gone for ${time_msg} because of "${lurk_msg == '!lurk' ? 
                    "No Message Provided" : lurk_msg}"`;
            delete this.#lurker_list[user.username];
            return msg;
        }
        //user wasn't already lurking
        return `You needed to be lurking already in order to stop lurking @${user.username}`;
    }

}

export default LurkList;