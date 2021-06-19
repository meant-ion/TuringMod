//file for the !roll command
const helper = require('./helper');

//handles validation, error checking, and calculating what to roll how many times
function getDiceRoll(target, user, cmdName, client) {
	//first things first, we check the command to see if they wanted to roll more than 1 die
	//copy out the character
	var checkerChar = cmdName.substring(5, 6);

	//set up a bool to see if the command was correct or not
	var isValidCmd = true;

	if (checkerChar == 'd') {//they rolled just one die

		//get the num of sides the user wants to roll for this and generate the roll
		const sides = parseInt(cmdName.substring(6, cmdName.length));
		const rolledNum = Math.floor(Math.random() * sides) + 1;
		//spit out the results to the chatroom
		client.say(target, `@${user.username} You rolled a d${sides} and got ${rolledNum}`);

	} else if (helper.isNumeric(checkerChar)) {//they want to roll more than 1 die

		//stash the first one into a var for safe keeping
		var numDiceToRoll = '';

		//to be used farther down, holding the number of sides on the die/dice
		var numSides = '';

		//set up a bool to tell if we have found the 'd' character, meaning we can find the sides now
		var hasD = false;

		//get the index of the 'd' character if present
		var dIndex = 0;

		//now, we see how many multiples they want to roll (numbers >= 10)
		var i;
		console.log(cmdName.substring(0, 5));
		for (i = cmdName.substring(0, 5).length; i < cmdName.length; ++i) {
			checkerChar = cmdName.substring(i, i + 1);
			if (helper.isNumeric(checkerChar)) {//the character was a number, so append it to the list
				numDiceToRoll += checkerChar;
			} else if (helper.isLetter(checkerChar)) {//the character was a letter
				//check to make sure that the alphabetical character is a d for the roll to go through
				if (checkerChar == 'd') {
					hasD = true;
					dIndex = i;
					break;
				} else {
					client.say(target, `Invalid command use. Please use 'd' to specify the number of sides on a die`);
					isValidCmd = false;
					break;
				}
			}
		}

		//now that we have rolled through the rest of the string, we see if any conditions tripped or not
		if (hasD && isValidCmd) {//this will mean is a valid command up to now
			//now we see if the remaining characters are numbers or not, and add them to a new variable to act as the sides of the die
			var i;
			for (i = dIndex + 1; i < cmdName.length; ++i) {
				if (i == cmdName.length) {
					checkerChar = cmdName.substring(i);
				} else {
					checkerChar = cmdName.substring(i, i + 1);
				}
				if (helper.isNumeric(checkerChar)) {//if it is a number, add it to the numSides var
					numSides += cmdName.substring(i, i + 1);
				} else {//we found a letter in with the command, so invalid
					client.say(target, `Invalid command use. Do not have any non numeric characters in with the number of sides`);
					isValidCmd = false;
					break;
				}
			}

			//now, we can begin calculations. First, we make sure the command is correct
			if (isValidCmd) {
				const total = rollDice(numDiceToRoll, numSides);
				client.say(target, `@${user.username} You rolled ${numDiceToRoll} d${numSides} and got ${total}`);
			}

		}
	}
}

//function that rolls the dice after all error checking and getting the right amount of rolls needed
function rollDice(numDice, sides) {
	const diceCount = parseInt(numDice);//number of times we will roll
	const sidesCount = parseInt(sides);//number of sides on the die that will be rolled
	var totalRoll = 0;
	var i;
	for (i = 0; i < diceCount; ++i) {
		totalRoll += (Math.floor(Math.random() * sidesCount) + 1);
	}
	return totalRoll;
}

module.exports = {
	getDiceRoll: getDiceRoll,
};