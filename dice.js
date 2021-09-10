// rewrite of dice.js, specifically to shove it into a class for better use. Same functionality, but as a class
// rather than a pile of functions. Slowly becoming more of a file holding all probability functions needed for the bot

const h = require('./helper');

class Dice {

	client = undefined;
	helper = new h();

	//@param   c   The Twitch chat client
    constructor(c) {
        this.client = c;
		
    }

    //handles validation, error checking, and calculating what to roll how many times
	//@param   cmdName   The full command passed in for the roll
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	async getDiceRoll(cmdName, user, target) {
		//first things first, we check the command to see if they wanted to roll more than 1 die
		//copy out the character
		let checkerChar = cmdName.substring(5, 6);

		//set up a bool to see if the command was correct or not
		let isValidCmd = true;

		//stash the first one into a var for safe keeping
		let numDiceToRoll = '';

		//set up a bool to tell if we have found the 'd' character, meaning we can find the sides now
		let hasD = false;

		//get the index of the 'd' character if present
		let dIndex = 0;

		//to be used farther down, holding the number of sides on the die/dice
		let numSides = '';

		//to be used to tell the minimum number that can be rolled for a dice roll at a time
		let minRoll = '';

		//set up bool to tell if we have a minimum roll requirement char 'r' to account for
		let hasR = false;

		//get the index of the 'r' character if present
		let rIndex = 0;

		//now, we see how many multiples they want to roll (numbers >= 10)
		let i;
		for (i = cmdName.substring(0, 5).length; i < cmdName.length; ++i) {
			checkerChar = cmdName.substring(i, i + 1);
			if (this.helper.isNumeric(checkerChar)) {//the character was a number, so append it to the list
				numDiceToRoll += checkerChar;
			} else if (this.helper.isLetter(checkerChar)) {//the character was a letter
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
			let i;
			for (i = dIndex + 1; i < cmdName.length; ++i) {
				if (i == cmdName.length) {
					checkerChar = cmdName.substring(i);
				} else {
					checkerChar = cmdName.substring(i, i + 1);
				}
				if (this.helper.isNumeric(checkerChar)) {//if it is a number, add it to the numSides var
					numSides += checkerChar;
				} else if (checkerChar.toLowerCase() == 'r') {
					hasR = true;
					rIndex = i;
					break;
				} else {//we found a letter in with the command, so invalid
					this.client.say(target, `Invalid command use. Do not have any non numeric characters in with the number of sides`);
					isValidCmd = false;
					break;
				}
			}

			//we have a minimum roll for this roll, so we are gonna see how low we can go
			if (isValidCmd && hasR) {
				for (let j = rIndex + 1; j < cmdName.length; ++j) {
					if (j == cmdName.length) {
						checkerChar = cmdName.substring(j);
					} else {
						checkerChar = cmdName.substring(j, j + 1);
					}
					if (this.helper.isNumeric(checkerChar)) {
						minRoll += checkerChar;
					} else {
						this.client.say(target, `Invalid minimum roll requirment, please try again`);
						isValidCmd = false;
						break;
					}
				}
			}

			//now, we can begin calculations. First, we make sure the command is correct
			if (isValidCmd) {
				const total = this.#rollDice(numDiceToRoll, numSides, minRoll);
				if (total != null) {
					this.client.say(target, `@${user.username} You rolled ${numDiceToRoll} d${numSides} and got ${total}`);
				} else {
					this.client.say(target, `@${user.username} Minimum roll was higher than possible highest roll`);
				}

			}

		}
	}

	//simple function that flips a "coin" and returns the side (Heads = 0, Tails = 1)
	//it's here in the Dice class since it's just a probability function
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	flipCoin(user, target) {
		let coinFlip = this.#rollDice(1, 2, '');

		let side = "";

		if (coinFlip == 1) {
			side = "Heads"
		} else {
			side = "Tails";
		}

		this.client.say(target, `@${user.username}: ${side}`);
	}

	//like Russian Roulette, but with timeouts instead of actual bullets
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	takeAChanceAtBeingBanned(user, target) {
		const willTheyBeBanned = Math.random() * (1000 - 1) + 1;
		if (willTheyBeBanned >= 999) {
			this.client.say(target, `How very unfortunate`);
			this.client.timeout(target, user.username, 10);
		} else {
			this.client.say(target, `Lucky you!`);
		}
	}

	//function that rolls the dice after all error checking and getting the right amount of rolls needed
	//@param   numDice   The number of dice we need to roll
	//@param   sides     The number of sides the dice have
	//@param   minRoll   The lowest that the computer can roll 
	//@return            Either the minRoll if the rolled number is lower, or the rolled amount
	#rollDice(numDice, sides, minRoll) {
		const diceCount = parseInt(numDice);//number of times we will roll
		const sidesCount = parseInt(sides);//number of sides on the die that will be rolled
		let minimumCount = 0;
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
		let totalRoll = 0;
		let i;
		for (i = 0; i < diceCount; ++i) {
			totalRoll += (Math.floor(Math.random() * sidesCount) + 1);
		}
		if (totalRoll < minimumCount && minimumCount != 0) {//if we didnt roll high enough, return the minimum roll
			return minimumCount;
		}
		return totalRoll;
	}

}

module.exports = Dice;
