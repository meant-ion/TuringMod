//file to hold our helper functions so that we can use them across files in the project

const url = require('url').URL;

//helper function to tell if a character is an operator that we want
function isOperator(charToCheck) {
    const operators = ['+', '-', '*', '/', '%', 'x', ':', '^', '!'];
    var i;
    for (i = 0; i < operators.length; ++i) {
        if (charToCheck == operators[i]) {
            return true;
        }
    }
    return false;
}

//combines the input into a single string
function combineInput(inputMsg, needWhiteSpace) {
    var combinedMsg = '';
    for (var i = 0; i < inputMsg.length; ++i) {
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
function getTimePassed(startTime, needDay) {

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
function isLetter(charToCheck) {
    return charToCheck.match(/[a-z]/i);
}

//helper function to see if a character is a number
function isNumeric(charToCheck) {
    return !isNaN(parseFloat(charToCheck)) && isFinite(charToCheck);
}

//simple helper to see if the user is the channel owner (streamer) or a moderator of the channel
function checkIfModOrStreamer(user, theStreamer) {
    return user.mod || user.username == theStreamer;
}

//checks the whole of a message to tell if there is a URL present. If so, it will return the url
function checkIfURL(inputMsg) {
    for (var i = 0; i < inputMsg.length; ++i) {
        try {
            new url(inputMsg[i]);
            return inputMsg[i];
        } catch (err) {}
    }
    return "";
}

//very rudimentary symbol spam detector. To be worked on and improved as time goes on
//currently justs sees if there's a lot of symbols in the message, not whether or not those symbols are in a correct place
//(i.e. "Hello there! Y'all'd've ain't done that, if you'd've been smarter" could get caught as spam (assuming enough contractions happen))
//Eventually, the algorithm used to detect the spam will be more efficient than O(n^2) like it is rn
function detectSymbolSpam(inputMsg, target) {

    let symbolCount = 0;

    //the regex that we will use to detect the symbol spam in a message
    var symList = "[]{}()\`~!@#$%^&*;:'\",<.>\/?-_+=".split('');

    var splitMsg = inputMsg.split('');

    //search the whole message for the symbols
    for (var i = 0; i < symList.length; ++i) {
        for (var j = 0; j < splitMsg.length; ++j) {
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

module.exports = {
    isOperator: isOperator,
    isLetter: isLetter,
    isNumeric: isNumeric,
    combineInput: combineInput,
    getTimePassed: getTimePassed,
    checkIfModOrStreamer: checkIfModOrStreamer,
    checkIfURL: checkIfURL,
    detectSymbolSpam: detectSymbolSpam,
};