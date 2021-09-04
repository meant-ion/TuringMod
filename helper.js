//file to hold our helper functions so that we can use them across files in the project

const url = require('url').URL;

class Helper {

    constructor() { }

    //helper function to tell if a character is an operator that we want
    //@param   charToCheck   self explanatory
    //@return                True/False
    isOperator(charToCheck) {
        const operators = ['+', '-', '*', '/', '%', 'x', ':', '^', '!'];
        for (let i = 0; i < operators.length; ++i) {
            if (charToCheck == operators[i]) {
                return true;
            }
        }
        return false;
    }

    //combines the input into a single string
    //@param   inputMsg         The message that needs to be combined into one string
    //@param   needWhiteSpace   Whether the string needs to have spaces between words
    //@return                   A string made up of all elements of the inputMsg array
    combineInput(inputMsg, needWhiteSpace) {
        let combinedMsg = '';
        for (let i = 0; i < inputMsg.length; ++i) {
            if (i != 0) {
                combinedMsg += inputMsg[i];
            }
            if (needWhiteSpace && (i + 1 != inputMsg.length)) {
                combinedMsg += ' ';
            }
        }
        return combinedMsg;
    }

    //function to get the time passed from one point to another
    //@param   startTime   The time and date we are calculating time passed from
    //@param   needDay     Tell if we need the number of days passed since the start
    //@return              A message telling how much time has passed since the starting date to the current date
    getTimePassed(startTime, needDay) {

        const curTime = new Date();
        const difference = (curTime.getTime() - startTime.getTime()) / 1000;
        const unflooredHours = difference / 3600;
        const flooredHours = Math.floor(unflooredHours);
        const days = Math.round(flooredHours / 24);
        const mins = Math.round((unflooredHours - flooredHours) * 60);
        const secs = Math.round((unflooredHours - flooredHours) * 3600);
        if (!needDay) {
            return `${flooredHours} hours ${mins % 60} minutes ${secs % 60} seconds`;
        }
        return `${days} days ${flooredHours % 24} hours ${mins % 60} minutes ${secs % 60} seconds`;
    }

    //helper function to see if a character is a letter (english only I think)
    //@param   charToCheck   self explanatory
    //@return                True/False
    isLetter(charToCheck) { return charToCheck.match(/[a-z]/i); }

    //helper function to see if a character is a number
    //@param   charToCheck   self explanatory
    //@return                True/False
    isNumeric(charToCheck) { return !isNaN(parseFloat(charToCheck)) && isFinite(charToCheck); }

    //simple helper to see if the user is the channel owner (streamer) or a moderator of the channel
    //@param   user          The name of the chat member that typed in the command
    //@param   theStreamer   The name of the channel owner
    //@return                True or false, depending on if the user is a mod or the streamer
    checkIfModOrStreamer(user, theStreamer) { return user.mod || user.username == theStreamer; }

    //checks the whole of a message to tell if there is a URL present. If so, it will return the url
    //@param   inputMsg   The message that is being read through to detect symbol spam
    //@return             The URL, or an empty string if not valid
    checkIfURL(inputMsg) {
        for (let i = 0; i < inputMsg.length; ++i) {
            try {
                new url(inputMsg[i]);
                return inputMsg[i];
            } catch (err) { }
        }
        return "";
    }

    //very rudimentary symbol spam detector. To be worked on and improved as time goes on
    //currently justs sees if there's a lot of symbols in the message, not whether or not those symbols are in a correct place
    //(i.e. "Hello there! Y'all'd've ain't done that, if you'd've been smarter" could get caught as spam (assuming enough contractions happen))
    //Eventually, the algorithm used to detect the spam will be more efficient than O(n^2) like it is rn
    //@param   inputMsg   The message that is being read through to detect symbol spam
    //@param   target     The chatroom that the message will be sent into
    //@param   user       The user that typed in the offending message
    //@return             True or false, depending on if the message was found to be spam
    detectSymbolSpam(inputMsg, target, user) {

        let symbolCount = 0;

        //the regex that we will use to detect the symbol spam in a message
        let symList = "[]{}()\`~!@#$%^&*;:'\",<.>\/?-_+=".split('');

        let splitMsg = inputMsg.split('');

        //search the whole message for the symbols
        for (let i = 0; i < symList.length; ++i) {
            for (let j = 0; j < splitMsg.length; ++j) {
                if (splitMsg[j].indexOf(symList[i]) > -1) {
                    symbolCount++;
                }
            }
        }

        //if enough are found, remove the message for spam
        if (symbolCount > 15) {
            client.timeout(target, user.username, 10, "No symbol spam in chat please");
            return true;
        }
        return false;
    }

    //Due to the recent issue on twitch with hate raids, figured that it would be a good idea to make this little thing
    //detects if the message passed in contains any unicode characters at all. If so (as to protect from hate spam) it deletes the message
    //@param   inputMsg   The message that is being read through to detect symbol spam
    //@param   target     The chatroom that the message will be sent into
    //@param   user       The user that typed in the offending message
    //@return             True or false, depending on if the message was found to be spam
    detectUnicode(inputMsg, target, user) {
        let msg =  this.combineInput(inputMsg, true);
        let regex = /^[ -~\t\n\r]*$/;
        if (regex.test(msg)) {
            client.timeout(target, user.username, 20, "Please, english only in this chatroom");
            return true;
        }
        return false;
    }

    //gets the current time in Central Standard Time in AM/PM configuration
    //@param   client   The bot's client for accessing the chat room
    //@param   target   The chatroom that the message will be sent into
    //@param   user     The name of the chat member that typed in the command
    getCurrentTime(client, target, user) {
        const curTime = new Date();
        let isAM = false;

        //calculate the hours in military configuration
        const unflooredHours = (curTime.getTime() / 1000) / 3600;
        const flooredHours = Math.floor(unflooredHours);
        const militaryHours = (flooredHours % 24) - 5;

        let trueHours = 0;

        //figure out what the military time converts to in standard configuration
        if (militaryHours > 0 && militaryHours <= 12) {
            trueHours = militaryHours;
            isAM = true;
        } else if (militaryHours > 12) {
            trueHours = militaryHours - 12;
            isAM = false;
        } else if (militaryHours == 0) {
            trueHours = 12;
            isAM = true;
        }

        //calculate the minutes, craft the message, and then send to chat
        const mins = Math.round((unflooredHours - flooredHours) * 60);
        let msg = `@${user.username}: Currently ${trueHours}:${mins % 60}`;
        if (isAM) {
            msg += ` A.M. `;
        } else {
            msg += ` P.M. `;
        }
        msg += `CST for the streamer`;
        client.say(target, msg);
    }

    //takes a number and rounds it out to two decimal points (for use as percentages)
    //@param   num   The number we wish to round
    //@return        The parameter passed in, but rounded to two decimal points
    roundToTwoDecimals(num) {
        let neg = false;
        if (num < 0) {
            neg = true;
            num *= -1;
        }
        let multiplier = Math.pow(10,2);
        num = parseFloat((num * multiplier).toFixed(11));
        num = (Math.round(num) / multiplier).toFixed(2);
        if (neg) {
            num = (num * -1).toFixed(2);
        }
        return num;
    }

    //converts a JSON list of key-value pairs into an array of values
    //@param   obj   The JSON object to be processed
    //@return        An array of values from the JSON object
    getGitStatsArray(obj) {
        const keys = Object.keys(obj);
        const r = [];
        for (let i = 0; i < keys.length; ++i) {
            r.push(obj[keys[i]]);
        }
        return r;
    }
}

module.exports = Helper;