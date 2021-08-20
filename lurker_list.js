// holds the classes necessary to make the lurker list for the !lurk and !unlurk commands

const h = require('./helper');

class LurkList {

    //the list that will hold all lurkers in the chatroom. Lurkers are added with the !lurk command and removed with the 
    //!unlurk command. Firing off the !unlurk command will return from here how long the lurker has been lurking for 

    #lurker_list;
    helper = new h();

    constructor() {
        this.#lurker_list = [];
    }

    addLurker(user, msg) {
        if (this.isLurking(user) == -1) {
            this.#lurker_list.push(new Lurker_Item(user.username, msg));
            return `See you whenever you get back @${user.username}`;
        }
        return `You're already lurking @${user.username}`
    }

    //finds the user in lurker_list if there, removes them from the list, and returns a string containing the amount of time
    //they were gone for. 
    removeLurker(user) {
        let index = this.isLurking(user);//ensures that we know if there's an issue
        if (index != -1) {

            let timeMsg = this.helper.getTimePassed(this.#lurker_list[index].getValue(), false);
            let lurkMsg = this.#lurker_list[index].getMsg();
            const msg = `Welcome back @${user.username}! You were gone for ${timeMsg} because of "${lurkMsg}"`;

            this.lurker_list.splice(index, 1);
            return msg;
        }
        //user wasn't already lurking
        return `You needed to be lurking already in order to stop lurking @${user.username}`;
    }

    //find the index of the lurker in the list if present
    isLurking(user) {
        for (let i = 0; i < this.#lurker_list.length; ++i) {
            if (this.#lurker_list[i].getKey() == user.username) {
                return i;
            }
        }
        return -1;
    }

}

class Lurker_Item {

    //Lurker_Item structure is pretty much gonna be a key/value pair
    //Key: the username of the person lurking
    //Value: the time the lurker was inserted into the LurkList; generated at creation
    //Msg: what message that the lurker decided to lurk with

    #key;
    #value;
    #msg;

    constructor(username, msg) {
        this.#key = username;
        this.#value = new Date();
        this.#msg = this.helper.combineInput(msg, true);
    }

    getKey() {
        return this.#key;
    }

    getValue() {
        return this.#value;
    }

    getMsg() {
        return this.#msg;
    }

}

module.exports = LurkList;