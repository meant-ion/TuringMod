//file for the !roll command
const helper = require('./helper');

//handles validation, error checking, and calculating what to roll how many times
async function getDiceRoll(target, user, cmdName, client) {
	//first things first, we check the command to see if they wanted to roll more than 1 die
	//copy out the character
	var checkerChar = cmdName.substring(5, 6);

	//set up a bool to see if the command was correct or not
	var isValidCmd = true;

	//stash the first one into a var for safe keeping
	var numDiceToRoll = '';

	//set up a bool to tell if we have found the 'd' character, meaning we can find the sides now
	var hasD = false;

	//get the index of the 'd' character if present
	var dIndex = 0;

	//to be used farther down, holding the number of sides on the die/dice
	var numSides = '';

	//to be used to tell the minimum number that can be rolled for a dice roll at a time
	var minRoll = '';

	//set up bool to tell if we have a minimum roll requirement char 'r' to account for
	var hasR = false;

	//get the index of the 'r' character if present
	var rIndex = 0;

	//now, we see how many multiples they want to roll (numbers >= 10)
	var i;
	for (i = cmdName.substring(0, 5).length; i < cmdName.length; ++i) {
		checkerChar = cmdName.substring(i, i + 1);
		if (helper.isNumeric(checkerChar)) {//the character was a number, so append it to the list
			numDiceToRoll += checkerChar;
		} else if (helper.isLetter(checkerChar)) {//the character was a letter
			//check to make sure that the alphabetical character is a d for the roll to go through
			if (checkerChar.toLowerCase() == 'd') {
				hasD = true;
				dIndex = i;
				if (numDiceToRoll == '') {//just in case the user only wanted to roll 1 die
					numDiceToRoll = '1'
                }
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
				numSides += checkerChar;
			} else if (checkerChar.toLowerCase() == 'r') {
				hasR = true;
				rIndex = i;
				break;
			} else {//we found a letter in with the command, so invalid
				client.say(target, `Invalid command use. Do not have any non numeric characters in with the number of sides`);
				isValidCmd = false;
				break;
            }
		}

		//we have a minimum roll for this roll, so we are gonna see how low we can go
		if (isValidCmd && hasR) {
			for (var j = rIndex + 1; j < cmdName.length; ++j) {
				if (j == cmdName.length) {
					checkerChar = cmdName.substring(j);
				} else {
					checkerChar = cmdName.substring(j, j + 1);
				}
				if (helper.isNumeric(checkerChar)) {
					minRoll += checkerChar;
				} else {
					client.say(target, `Invalid minimum roll requirment, please try again`);
					isValidCmd = false;
					break;
				}
			}
        }

		//now, we can begin calculations. First, we make sure the command is correct
		if (isValidCmd) {
			const total = rollDice(numDiceToRoll, numSides, minRoll);
			if (total != null) {
				client.say(target, `@${user.username} You rolled ${numDiceToRoll} d${numSides} and got ${total}`);
			} else {
				client.say(target, `@${user.username} Minimum roll was higher than possible highest roll`);
            }
				
		}

	}
}

//function that rolls the dice after all error checking and getting the right amount of rolls needed
function rollDice(numDice, sides, minRoll) {
	const diceCount = parseInt(numDice);//number of times we will roll
	const sidesCount = parseInt(sides);//number of sides on the die that will be rolled
	console.log(sidesCount);
	var minimumCount = 0;
	console.log(minRoll);
	if (minRoll == '') {
		minimumCount = 0;
	} else {
		minimumCount = parseInt(minRoll);
    }
	

	//error check to make sure that the minimum isnt greater than highest possible roll
	if (minimumCount > (sidesCount * diceCount)) {
		return null;
    }

	//and now we do the rolling
	var totalRoll = 0;
	var i;
	for (i = 0; i < diceCount; ++i) {
		totalRoll += (Math.floor(Math.random() * sidesCount) + 1);
	}
	if (totalRoll < minimumCount && minimumCount != 0) {//if we didnt roll high enough, return the minimum roll
		return minimumCount;
    }
	return totalRoll;
}

module.exports = {
	getDiceRoll: getDiceRoll,
};