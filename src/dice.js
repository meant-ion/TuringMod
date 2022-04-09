// rewrite of dice.js, specifically to shove it into a class for better use. Same functionality, but as a class
// rather than a pile of functions. Slowly becoming more of a file holding all probability functions needed for the bot

import Helper from './helper.js';

export class Dice {

	helper = new Helper();

    constructor() {}

    //handles validation, error checking, and calculating what to roll how many times
	//@param   cmd_name   The full command passed in for the roll
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	async getDiceRoll(cmd_name) {
		//first things first, we check the command to see if they wanted to roll more than 1 die
		//copy out the character
		try {

			//split the string into separate numbers and characters for faster lookups
			//regex found from this answer on StackOverflow: https://stackoverflow.com/a/11233149
			//change made was removing double backslash to make regex work for JS instead of Java
			const split_cmd = cmd_name.split(/(?<=\d)(?=\D)|(?=\d)(?<=\D)/g);

			//at maximum, the roll command string when split, is of length 5 and minimum 2
			//if any higher or lower, its an invalid roll
			if (split_cmd.length > 5 || split_cmd.length < 2) {
				//this.client.say(target, 'Invalid command syntax');
				return 'Invalid command syntax';
			}

			//get the location of the r in the string if applicable
			//will be used to make sure input is valid and trailing number comes after minimum roll
			const r_loc = split_cmd.indexOf("r");

			//with the split made, we verify that the num of sides has been decided and the minimum roll if applicable
			const has_r = (r_loc != -1) ? true : false;
			const has_d = (split_cmd[0] == 'd' || split_cmd[1] == 'd') ? true : false;

			//get the location of the d in the string, so we know if we need to roll multiple dice
			const d_loc = split_cmd.indexOf('d');

			//if we have no d, we dont know what to roll. So we return an error and go from there
			if (!has_d) {
				//this.client.say(target, `Invalid command use. Please use 'd' to specify the number of sides on a die`);
				return "Invalid command use. Please use 'd' to specify the number of sides on a die";
			}

			if (r_loc == split_cmd.length - 1) {
				//this.client.say(target, 'Invalid command use; Missing minimum roll amount');
				return 'Invalid command use; Missing minimum roll amount';
			}

			//with all possible cases checked, we will make the roll and return the result to the chatroom
			const num_dice_to_roll = (d_loc == 0) ? 1 : split_cmd[0];
			const num_sides = split_cmd[d_loc+1];
			const total = this.#rollDice(num_dice_to_roll, num_sides, (has_r) ? split_cmd[split_cmd.length - 1] : '');
			if (total != null) return `You rolled ${num_dice_to_roll} d${num_sides} and got ${total}`;
			else return 'Minimum roll was higher than possible highest roll';

		} catch (err) {
			console.error(err);
			return 'Error in rolling dice';
		}
	}

	//simple function that flips a "coin" and returns the side (Heads = 0, Tails = 1)
	//it's here in the Dice class since it's just a probability function
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	flipCoin() { return (this.#rollDice(1, 2, '') > 1) ? "Heads" : "Tails"; }

	//like Russian Roulette, but with timeouts instead of actual bullets
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	takeAChanceAtBeingBanned() { return ((Math.random() * (1000 - 1) + 1) >= 999) ? 'How very unfortunate' : 'Lucky you!'; }

	generateHexColorCode() {
		//0123456789abcdef
		//#000000 -> BLACK
		let color_code = '#';
		for (let i = 0; i < 6; ++i) color_code += (Math.floor(Math.random() * 16)).toString(16);
		return color_code;
	}

	//function that rolls the dice after all error checking and getting the right amount of rolls needed
	//@param   num_dice   The number of dice we need to roll
	//@param   sides      The number of sides the dice have
	//@param   min_roll   The lowest that the computer can roll 
	//@return             Either the minRoll if the rolled number is lower, or the rolled amount
	#rollDice(num_dice, sides, min_roll) {
		const dice_count = parseInt(num_dice);//number of times we will roll
		const sides_count = parseInt(sides);//number of sides on the die that will be rolled
		const min_count = (min_roll == '') ? 0 : parseInt(min_roll);

		//error check to make sure that the minimum isnt greater than highest possible roll
		if (min_count > (sides_count * dice_count)) return null;

		//and now we do the rolling
		let total_roll = 0;
		for (let i = 0; i < dice_count; ++i) total_roll += (Math.floor(Math.random() * sides_count) + 1);
		//if we didnt roll high enough, return the minimum roll
		if (total_roll < min_count && min_count != 0) return min_count;
		return total_roll;
	}

}

export default Dice;
