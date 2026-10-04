// the generated class for loading commands from file and creating new ones
// all returns are wrapped in promises, since getting data from DB is slower than from memory directly

import sqlite3 from 'sqlite3';

export class CommandArray {

	#db;

	constructor() {
		this.#db = new sqlite3.Database('G:/sqlite3/test.db', (err) => {
			if (err) console.error(err);
			console.log("* Connected to on-disk SQLite DB");
		});
	}

	/**
	 * allows for the mods and the streamer to create a command and then write it to file for safe keeping
	 * @param {string} user username 
	 * @param {string} input_msg message from the chatroom
	 * @returns {Promise<string>} success/failure message
	 */
	createAndWriteCommandsToFile(user, input_msg) {

		return new Promise((resolve, _reject) => {
			if (input_msg.length == 0) resolve('Invalid input for a command');
			else {
				const ins_sql = !(input_msg[1] == 'true')? `INSERT INTO stdcommands VALUES(?,?,?);` : `INSERT INTO intervalcommands VALUES(?,?,?);`;

				//inputMsg will have form !command isInterval(t/f) cmdName(string) msg(rest of message)
				const name = input_msg[2];
				let msg = '';
				for (let i = 3; i < input_msg.length; ++i) msg += input_msg[i] + " ";

				//run the command through the db and send out the resolution
				this.#db.run(ins_sql, [name, user, msg], (err) => {
					if (err) {
						console.error(err);
						resolve('Error adding command to database');
					} else {
						resolve(`Command successfully added to database`);
					}
				});
			}
		});
	}

	/**
	 * removes a command from the list of custom commands
	 * @param {string} command 
	 * @param {boolean} is_interval 
	 * @returns {Promise<string>} message stating success/fail at deleting command
	 */
	removeCommand(command, is_interval) {

		//determine if this command is freely callable or called on an interval (different tables for them)
		const del_sql = !is_interval ? `DELETE FROM stdcommands WHERE name = ?;` : `DELETE FROM intervalcommands WHERE name = ?;`;

		return new Promise((resolve, _reject) => {
			this.#db.run(del_sql, command, (err) => {
				if (err) {
					resolve(`Could not find specific command to delete`);
					console.error(err);
				} else {
					resolve(`Command successfully deleted from database`);
				}
			});
		})

	}

	/**
	 * edits command's message
	 * @param {Array<string>} input_msg new message for command
	 * @returns {Promise<string>} success/fail message
	 */
	editCommand(input_msg) {

		return new Promise((resolve, _reject) => {
			//determine if this command is freely callable or called on an interval (different tables for them)
			const update_sql = !((input_msg[1] == 'true')) ? `UPDATE stdcommands SET msg = ? WHERE name = ?;` : `UPDATE intervalcommands SET msg = ? WHERE name = ?;`;

			//assemble the message to post back into place
			const command_to_edit = input_msg[2];
			let msg = "";
			for (let i = 3; i < input_msg.length; ++i) msg += input_msg[i] + " ";

			//run the sql command and spit out the result
			this.#db.run(update_sql, [msg, command_to_edit], (err) => {
				if (err) {
					console.error(err);
					resolve('Could not find command to edit');
				} else {
					resolve('Command successfully updated in database');
				}
			});
		});
    }

	/**
	 * prints out a list of all custom created commands for use
	 * @returns {Promise<string>} list of all command names in DB/fail message
	 */
	postListOfCreatedCommands() {
		return new Promise((resolve, _reject) => {
			let msg = 'These are the current custom commands available: ';

			this.#db.all('SELECT name, msg FROM stdcommands;', [], (err, rows) => {
				if (err) {
					console.error(err);
					resolve('NaN. Error in getting list of custom commands');
				} else {
					rows.forEach((row) => msg += row.name + ", ");
					resolve(msg);
				}
			});
		});
	}

	/**
	 * gets a command for the interval message loop with provided index
	 * @param {Number} index 
	 * @returns {Promise<string>} interval command message
	 */
	getIntervalCommand(index) {
		return new Promise((resolve, _reject) => {
			this.#db.all(`SELECT msg FROM intervalcommands;`, (err, rows) => {
				if (err) {
					console.error(err);
					resolve('Error in getting interval command');
				}
			   //just using the hard-coded target channel here since this version of the bot will only be used on this channel
				else resolve(rows[index].msg);
			});
		})
	}

	/**
	 * resets the index of the command we're getting for the interval messages
	 * @param {Number} index 
	 * @returns {Promise<Number>} command index number
	 */
	async getLengthOfIntervals(index) {

		const length_sql = `SELECT COUNT(*) FROM intervalcommands;`;

		//build the promise and send it out with what we have produced
		return new Promise((resolve, reject) => {

			this.#db.get(length_sql, (err, row) => {
				if (err) reject(err);  else 
					//send out either 0 if we reach the end of the entries in the DB, or the index + 1 otherwise
					if (row['COUNT(*)'] <= index + 1) resolve(0);
					else resolve(index + 1);
			});
		});
	}

	/**
	 * gets and updates the amount of times my voice has cracked on stream
	 * @returns {Promise<Number>} voice crack count
	 */
	getAndUpdateVoiceCracks() {
		return new Promise((resolve, _reject) => {
			this.#db.get('SELECT num FROM voicecracks;', (err, row) => {
				if (err) {
					console.error(err); 
					resolve('Error in getting voice cracks');
				} else {
					const count = parseInt(row['num']) + 1;
					//client.say(target, `Streamer's voice has cracked ${count} times.`);
					const update_sql = `UPDATE voicecracks SET num = ?;`
	
					//now we update the count by 1 and push that new count to the DB
					this.#db.run(update_sql, [count.toString()], (err) => {
						if (err) {
							console.error(err); 
							resolve('Error updating number of voicecracks');
						} else {
							console.log("* Voice cracks count updated");
						}
					});
					resolve(count);
				}
			});
		});
	}

	/**
	 * updates the death count for when I play a difficult game and/or just bad at games
	 * syntactically similar to above function for voice cracks
	 * @returns {Promise<Number>} death count 
	 */
	getAndUpdateDeathCount() {
		return new Promise((resolve, _reject) => {
			this.#db.get('SELECT deaths FROM death_count;', (err, row) => {

				if (err) { 
					console.error(err); 
					resolve('Error in getting death counts');
				} else {
					let count = parseInt(row['deaths']) + 1;
					const update_sql = 'UPDATE death_count SET deaths = ?;';
					this.#db.run(update_sql, [count], (err) => {
						if (err) {
							console.error(err); 
							resolve('Error in updating death count');
						} else {
							console.log("* Death count updated");
						} 
					});
					resolve(count);
				}
			});
		});
	}

	/**
	 * sets the death counts for a game back to zero
	 * @returns {Promise<string>} success/error message
	 */
	setDeathsToZero() {
		return new Promise((resolve, _reject) => {
			this.#db.get('UPDATE death_count SET deaths = 0;', (err) => {
				if (err) {
					console.error(err);
					resolve('Error in resetting death count');
				}  else {
					resolve('Death count reset back to zero');
				}
			});
		});
	}

	/**
	 * fetches the custom commands stored in the database for posting in the chat room
	 * @param {string} command command's name 
	 * @returns {Promise<string>} command message or empty string
	 */
	getCustomCommand(command) {
		return new Promise((resolve, _reject) => {
			this.#db.get(`SELECT name, msg FROM stdcommands WHERE name = ?;`, [command], (err, row) => {
				if (err) resolve('');
				else if (row == undefined) resolve('');
				else resolve(row.msg);
			});
		});
    }

	// TWITCH TOKEN REFRESH FUNCTIONS

	/**
	 * gets a specific item from the DB as we need it
	 * @param {Number} index 
	 * @returns {Promise<Array<string>> || Promise<string>} requested item(s)
	 */
	getTwitchInfo(index) {
		let item;
		switch(index) {
			case 0:
				item = "access_token";
				break;
			case 1:
				item = "refresh_token";
				break;
			case 2:
				item = "scopes";
				break;
			case 3:
				item = "client_id, client_secret, scopes, redirect_url, state";
				break;
		}

		const twitch_sql = `SELECT ${item} FROM twitch_auth;`;

		return new Promise((resolve, reject) => {
			this.#db.get(twitch_sql, (err, row) => {
				if(err) reject(err); else{
					if (index == 3) {
						let arr = ["","","","",""];
						arr[0] = row["client_id"];
						arr[1] = row["client_secret"];
						arr[2] = row["scopes"];
						arr[3] = row["redirect_url"];
						arr[4] = row["state"];
						resolve(arr);
					} else {
						resolve(row[item]);
					}
				} 
			});
		});
		
	}

	/**
	 * gets the client id and secret of the bot so we can use the Helix API
	 * @returns {Promise<Array<string>>} client id/secret array
	 */
	getIdAndSecret() {
		const twitch_sql = `SELECT client_id, client_secret FROM twitch_auth;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(twitch_sql, (err, row) => {
				if (err) reject(err); else {
					let arr = [``,``];
					arr[0] = row.client_id;
					arr[1] = row.client_secret;
					resolve(arr);
				}
			});
		});
		
	}

	/**
	 * writes the new tokens to DB after they are gathered from the API
	 * @param {string} access_token 
	 * @param {string} refresh_token 
	 */
	writeTwitchTokensToDB(access_token, refresh_token) {
		const update_sql = "UPDATE twitch_auth SET access_token = ?, refresh_token = ?;";

		this.#db.run(update_sql, [access_token, refresh_token], (err) => {
			if (err) console.error(err); else console.log("* New Twitch Tokens written to DB successfully!");
		});
	}

	// END TWITCH TOKEN REFRESH FUNCTIONS

	/**
	 * gets an API key for the requested API. Currently holds NASA's API key only
	 * @param {Number} key_to_get 
	 * @returns {Promise<string>} API key
	 */
	getAPIKeys(key_to_get) {
		const keys_sql = `SELECT ${key_to_get} FROM api_keys;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(keys_sql, (err, row) => {
				if(err) reject(err); else resolve(row[key]);
			});
		});
	}
}

export default CommandArray;

