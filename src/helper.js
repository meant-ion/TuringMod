//file to hold our helper functions so that we can use them across files in the project

import {URL as url} from 'url';

export class Helper {

    constructor() { }

    //helper function to tell if a character is an operator that we want (single char, non function operators only)
    //@param   char_to_check   self explanatory
    //@return                True/False
    isOperator(char_to_check) {
        const operators = ['+', '-', '*', '/', '%', 'x', ':', '^', '!', '<', '>'];
        for (let i = 0; i < operators.length; ++i) 
            if (char_to_check == operators[i]) return true;
        return false;
    }

    //combines the input into a single string
    //@param   input_msg          The message that needs to be combined into one string
    //@param   need_white_space   Whether the string needs to have spaces between words
    //@return                     A string made up of all elements of the inputMsg array
    combineInput(input_msg, need_white_space) {
        let combined_msg = '';
        for (let i = 0; i < input_msg.length; ++i) {
            if (i != 0) combined_msg += input_msg[i];
            if (need_white_space && (i + 1 != input_msg.length)) combined_msg += ' ';
        }
        return combined_msg;
    }

    //removes any commas present within the input message
    //@param   input_msg   The message that needs to have its commas removed
    //@returns             An array of strings without any commas present
    replaceCommasWithSpaces(input_msg) {
        let combined_msg = [];
        input_msg.forEach(item => {if (item != ',') combined_msg.push(item);});
        return combined_msg;
    }

    //function to get the time passed from one point to another
    //@param   start_time   The time and date we are calculating time passed from
    //@param   need_day     Tell if we need the number of days passed since the start
    //@return              A message telling how much time has passed since the starting date to the current date
    getTimePassed(start_time, need_day) {

        const cur_time = new Date();
        const difference = (cur_time.getTime() - start_time.getTime()) / 1000;
        const unfloored_hours = difference / 3600;
        const floored_hours = Math.floor(unfloored_hours);
        const days = Math.round(floored_hours / 24);
        const mins = Math.round((unfloored_hours - floored_hours) * 60);
        const secs = Math.round((unfloored_hours - floored_hours) * 3600);
        if (!need_day) return `${floored_hours} hours ${mins % 60} minutes ${secs % 60} seconds`;
        return `${days} days ${floored_hours % 24} hours ${mins % 60} minutes ${secs % 60} seconds`;
    }

    //helper function to see if a character is a letter (english only I think)
    //@param   char_to_check   self explanatory
    //@return                True/False
    isLetter(char_to_theck) { return char_to_theck.match(/[a-z]/i); }

    //helper function to see if a character is a number
    //@param   char_to_check   self explanatory
    //@return                True/False
    isNumeric(char_to_check) { return !isNaN(parseFloat(char_to_check)) && isFinite(char_to_check); }

    //simple helper to see if the user is the channel owner (streamer) or a moderator of the channel
    //@param   user           The name of the chat member that typed in the command
    //@param   the_streamer   The name of the channel owner
    //@return                 True or false, depending on if the user is a mod or the streamer
    checkIfModOrStreamer(user, the_streamer) { return user.mod || user.username == the_streamer; }

    //helper function that tells us only if the user is the streamer or not
    //@param   user           The name of the chat member that typed in the command
    //@param   the_streamer   The name of the channel owner
    //@return                 True or false, depending on if the user is the streamer
    isStreamer(username, the_streamer) { return username == the_streamer; }

    //checks the whole of a message to tell if there is a URL present. If so, it will return the url
    //@param   input_msg   The message that is being read through to detect symbol spam
    //@return             The URL, or an empty string if not valid
    checkIfURL(input_msg) {
        //do not have this be a forEach loop, it will not work lol
        for (let i = 0; i < input_msg.length; ++i) 
            try {
                new url(input_msg[i]);
                return input_msg[i];
            } catch (err) { }
        
        return "";
    }

    //very rudimentary symbol spam detector. To be worked on and improved as time goes on
    //currently justs sees if there's a lot of symbols in the message, not whether or not those symbols are in a correct place
    //(i.e. "Hello there! Y'all'd've ain't done that, if you'd've been smarter" could get caught as spam (assuming enough contractions happen))
    //@param   input_msg   The message that is being read through to detect symbol spam
    //@param   target     The chatroom that the message will be sent into
    //@param   user       The user that typed in the offending message
    //@return             True or false, depending on if the message was found to be spam
    detectSymbolSpam(input_msg, target, user, client) {

        //the regex that we will use to detect the symbol spam in a message
        let sym_list = /[|]|{|}|\(|\)|\\|`|~|!|@|#|\$|%|\^|&|\*|;|:|'|"|,|<|.|>|\/|\?|-|_|=|\+|\|/;

        input_msg = this.combineInput(input_msg, true);
        //search the whole message for the symbols. If enough are found, remove the message for spam
        let match_list = input_msg.match(sym_list);
        if (match_list != null && match_list.length > 15) {
            client.say(target, `@${user.username}: Kill it with the symbols please`);
            client.timeout(target, user.username, 1, "No symbol spam in chat please");
            return true;
        }
        return false;
    }

    //Due to the recent issue on twitch with hate raids, figured that it would be a good idea to make this little thing
    //detects if the message passed in contains any unicode characters at all. If so (as to protect from hate spam) it deletes the message
    //@param   input_msg   The message that is being read through to detect symbol spam
    //@param   target     The chatroom that the message will be sent into
    //@param   user       The user that typed in the offending message
    //@return             True or false, depending on if the message was found to be spam
    detectUnicode(input_msg, target, user, client) {
        let regex = /\p{Script=Latin}|\p{Emoji_Presentation}|\p{P}|\p{S}|\p{N}/u;//range of all ascii chars, punctuation and emojis
        //split string into words via for-each loop
        input_msg.forEach(item => {
            //split word into character array and loop through it, testing each char w/ regex
            let char_arr = item.split("");
            char_arr.forEach(char => {
                if (!regex.test(char)) {
                    client.say(target, `@${user.username}: English only characters please`);
                    client.timeout(target, user.username, 10, "No non-ASCII/Emoji chars please");
                    return true;
                }
            });
        });
        return false;
    }

    //Tells if the message sent by the user is @-ing the streamer
    //@param   input_msg      The whole message sent by the user
    //@returns                T/F if the streamer is @'ed in the message
    isStreamerMentioned(input_msg) {
        input_msg = input_msg.map(item => item.toLowerCase());
        return input_msg.includes('@pope_pontus');
    }

    //gets the current time in Central Standard Time in AM/PM configuration
    //@param   client   The bot's client for accessing the chat room
    //@param   target   The chatroom that the message will be sent into
    //@param   user     The name of the chat member that typed in the command
    getCurrentTime(client, target, user) {
        const curTime = new Date();
        let is_AM = false;

        //calculate the hours in military configuration
        const unfloored_hours = (curTime.getTime() / 1000) / 3600;
        const floored_hours = Math.floor(unfloored_hours);
        const military_hours = (floored_hours % 24) - 5;

        let true_hours = 0;

        //figure out what the military time converts to in standard configuration
        if (military_hours > 0 && military_hours < 12) {
            true_hours = military_hours;
            is_AM = true;
        } else if (military_hours == 12) {
            true_hours = military_hours;
            is_AM = false;
        } else if (military_hours > 12) {
            true_hours = military_hours - 12;
            is_AM = false;
        } else if (military_hours == 0) {
            true_hours = 12;
            is_AM = true;
        }

        //calculate the minutes, craft the message, and then send to chat
        const mins = Math.round((unfloored_hours - floored_hours) * 60);
        let msg = `@${user.username}: Currently ${true_hours}:${mins % 60}`;
        if (is_AM) msg += ` A.M. `; else msg += ` P.M. `;
        msg += `CST for the streamer`;
        client.say(target, msg);
    }

    //takes a number and rounds it out to two decimal points (for use as percentages)
    //@param   num             The number we wish to round
    //@param   is_percentage   Boolean to tell us if we are rounding a percentage or not
    //@return                  The parameter passed in, but rounded to two decimal points
    roundToTwoDecimals(num, is_percentage) {
        let neg = false;
        if (num < 0 && is_percentage) {
            neg = true;
            num *= -1;
        }
        let multiplier = Math.pow(10,2);
        num = parseFloat((num * multiplier).toFixed(11));
        num = (Math.round(num) / multiplier).toFixed(2);
        if (neg) num = (num * -1).toFixed(2);
        return num;
    }

    //converts a JSON list of key-value pairs into an array of values
    //@param   obj   The JSON object to be processed
    //@return        An array of values from the JSON object
    getGitStatsArray(obj) {
        const keys = Object.keys(obj);
        const r = [];
        keys.forEach(item => r.push(obj[item]));
        return r;
    }
}

export default Helper;