import Helper from './helper.js';

export class Dice {

	/**
	 * @param {Helper} h 
	 */
    constructor(h) {
		this.helper = h;
	}

	/**
	 * handles validation, error checking, and calculating what to roll how many times
	 * @param {string} cmd_name full request for dice roll; format "#d#r#"
	 * @returns {string} roll results message or error message
	 */
	async getDiceRoll(cmd_name) {
		try {
			//split the string into separate numbers and characters for faster lookups
			//regex found from this answer on StackOverflow: https://stackoverflow.com/a/11233149
			//change made was removing double backslash to make regex work for JS instead of Java
			const split_cmd = cmd_name.split(/(?<=\d)(?=\D)|(?=\d)(?<=\D)/g);

			//at maximum, the roll command string when split, is of length 5 and minimum 2
			//if any higher or lower, its an invalid roll
			if (split_cmd.length > 5 || split_cmd.length < 2) return 'Invalid command syntax';

			//get the location of the r in the string if applicable
			//will be used to make sure input is valid and trailing number comes after minimum roll
			const r_loc = split_cmd.indexOf("r");

			//with the split made, we verify that the num of sides has been decided and the minimum roll if applicable
			const has_r = (r_loc != -1) ? true : false;
			const has_d = (split_cmd[0] == 'd' || split_cmd[1] == 'd') ? true : false;

			// determine if multiple dice rolls requested
			const d_loc = split_cmd.indexOf('d');

			if (!has_d) return "Invalid command use. Please use 'd' to specify the number of sides on a die";

			if (r_loc == split_cmd.length - 1) return 'Invalid command use; Missing minimum roll amount';

			//with all possible cases checked, we will make the roll and return the result to the chatroom
			const num_dice_to_roll = (d_loc == 0) ? 1 : split_cmd[0];
			const num_sides = split_cmd[d_loc+1];
			if (num_dice_to_roll >= 100000000 || num_sides >= 100000000) return 'Amount to roll or number of sides too high';
			const total = this.#rollDice(num_dice_to_roll, num_sides, (has_r) ? split_cmd[split_cmd.length - 1] : '');
			if (total != null) return `You rolled ${num_dice_to_roll} d${num_sides} and got ${total}`;
			else return 'Minimum roll was higher than possible highest roll';

		} catch (err) {
			console.error(err);
			return 'Error in rolling dice';
		}
	}

	/**
	 * simple function that flips a "coin" and returns the side; it's here in the Dice class since it's just a probability function
	 * @returns {string} Heads or Tails
	 */
	flipCoin() { return (this.#rollDice(1, 2, '') > 1) ? "Heads" : "Tails"; }

	/**
	 * function that rolls the dice after all error checking and getting the right amount of rolls needed
	 * @param {string} num_dice number of dice to roll 
	 * @param {string} sides number of sides on die
	 * @param {string} min_roll minimum number that can be rolled
	 * @returns {Number} number rolled by dice
	 */
	#rollDice(num_dice, sides, min_roll) {
		const dice_count = parseInt(num_dice);
		const sides_count = parseInt(sides);
		const min_count = (min_roll == '') ? 0 : parseInt(min_roll);

		//error check to make sure that the minimum isnt greater than highest possible roll
		if (min_count > (sides_count * dice_count)) return null;

		let total_roll = 0;
		for (let i = 0; i < dice_count; ++i) total_roll += (Math.floor(Math.random() * sides_count) + 1);
		//if we didnt roll high enough, return the minimum roll
		if (total_roll < min_count && min_count != 0) return min_count;
		return total_roll;
	}

}

export default Dice;
