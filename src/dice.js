// rewrite of dice.js, specifically to shove it into a class for better use. Same functionality, but as a class
// rather than a pile of functions. Slowly becoming more of a file holding all probability functions needed for the bot

import Helper from './helper.js';

export class Dice {

	client = undefined;
	helper = new Helper();

	//@param   c   The Twitch chat client
    constructor(c) {
        this.client = c;
    }

    //handles validation, error checking, and calculating what to roll how many times
	//@param   cmd_name   The full command passed in for the roll
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	async getDiceRoll(cmd_name, user, target) {
		//first things first, we check the command to see if they wanted to roll more than 1 die
		//copy out the character
		let checker_char = cmd_name.substring(5, 6);

		//set up a bool to see if the command was correct or not
		let is_valid_cmd = true;

		//stash the first one into a var for safe keeping
		let num_dice_to_roll = '';

		//set up a bool to tell if we have found the 'd' character, meaning we can find the sides now
		let has_d = false;

		//get the index of the 'd' character if present
		let d_index = 0;

		//to be used farther down, holding the number of sides on the die/dice
		let num_sides = '';

		//to be used to tell the minimum number that can be rolled for a dice roll at a time
		let min_roll = '';

		//set up bool to tell if we have a minimum roll requirement char 'r' to account for
		let has_r = false;

		//get the index of the 'r' character if present
		let r_index = 0;

		//now, we see how many multiples they want to roll (numbers >= 10)
		let i;
		for (i = cmd_name.substring(0, 5).length; i < cmd_name.length; ++i) {
			checker_char = cmd_name.substring(i, i + 1);
			if (this.helper.isNumeric(checker_char)) {//the character was a number, so append it to the list
				num_dice_to_roll += checker_char;
			} else if (this.helper.isLetter(checker_char)) {//the character was a letter
				//check to make sure that the alphabetical character is a d for the roll to go through
				if (checker_char.toLowerCase() == 'd') {
					has_d = true;
					d_index = i;
					if (num_dice_to_roll == '') {//just in case the user only wanted to roll 1 die
						num_dice_to_roll = '1'
					}
					break;
				} else {
					this.client.say(target, `Invalid command use. Please use 'd' to specify the number of sides on a die`);
					is_valid_cmd = false;
					break;
				}
			}
		}

		//now that we have rolled through the rest of the string, we see if any conditions tripped or not
		if (has_d && is_valid_cmd) {//this will mean is a valid command up to now
			//now we see if the remaining characters are numbers or not, and add them to a new variable to act as the sides of the die
			let i;
			for (i = d_index + 1; i < cmd_name.length; ++i) {
				if (i == cmd_name.length) {
					checker_char = cmd_name.substring(i);
				} else {
					checker_char = cmd_name.substring(i, i + 1);
				}
				if (this.helper.isNumeric(checker_char)) {//if it is a number, add it to the numSides var
					num_sides += checker_char;
				} else if (checker_char.toLowerCase() == 'r') {
					has_r = true;
					r_index = i;
					break;
				} else {//we found a letter in with the command, so invalid
					this.client.say(target, `Invalid command use. Do not have any non numeric characters in with the number of sides`);
					is_valid_cmd = false;
					break;
				}
			}

			//we have a minimum roll for this roll, so we are gonna see how low we can go
			if (is_valid_cmd && has_r) {
				for (let j = r_index + 1; j < cmd_name.length; ++j) {
					if (j == cmd_name.length) {
						checker_char = cmd_name.substring(j);
					} else {
						checker_char = cmd_name.substring(j, j + 1);
					}
					if (this.helper.isNumeric(checker_char)) {
						min_roll += checker_char;
					} else {
						this.client.say(target, `Invalid minimum roll requirment, please try again`);
						is_valid_cmd = false;
						break;
					}
				}
			}

			//now, we can begin calculations. First, we make sure the command is correct
			if (is_valid_cmd) {
				const total = this.#rollDice(num_dice_to_roll, num_sides, min_roll);
				if (total != null) {
					this.client.say(target, `@${user.username} You rolled ${num_dice_to_roll} d${num_sides} and got ${total}`);
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
		let coin_flip = this.#rollDice(1, 2, '');

		let side = "";

		if (coin_flip == 1) {
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
		const will_they_be_banned = Math.random() * (1000 - 1) + 1;
		if (will_they_be_banned >= 999) {
			this.client.say(target, `How very unfortunate`);
			this.client.timeout(target, user.username, 10);
		} else {
			this.client.say(target, `Lucky you!`);
		}
	}

	//function that rolls the dice after all error checking and getting the right amount of rolls needed
	//@param   num_dice   The number of dice we need to roll
	//@param   sides     The number of sides the dice have
	//@param   min_roll   The lowest that the computer can roll 
	//@return            Either the minRoll if the rolled number is lower, or the rolled amount
	#rollDice(num_dice, sides, min_roll) {
		const dice_count = parseInt(num_dice);//number of times we will roll
		const sides_count = parseInt(sides);//number of sides on the die that will be rolled
		let min_count = 0;
		if (min_roll == '') {
			min_count = 0;
		} else {
			min_count = parseInt(min_roll);
		}


		//error check to make sure that the minimum isnt greater than highest possible roll
		if (min_count > (sides_count * dice_count)) {
			return null;
		}

		//and now we do the rolling
		let total_roll = 0;
		let i;
		for (i = 0; i < dice_count; ++i) {
			total_roll += (Math.floor(Math.random() * sides_count) + 1);
		}
		if (total_roll < min_count && min_count != 0) {//if we didnt roll high enough, return the minimum roll
			return min_count;
		}
		return total_roll;
	}

}

export default Dice;
