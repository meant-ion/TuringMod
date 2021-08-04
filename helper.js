//file to hold our helper functions so that we can use them across files in the project

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

module.exports = {
    isOperator: isOperator,
    isLetter: isLetter,
    isNumeric: isNumeric,
    combineInput: combineInput,
    getTimePassed: getTimePassed,
    checkIfModOrStreamer: checkIfModOrStreamer,
};