//the generated class for loading commands from file and creating new ones
//trying something different with this one, in stuffing the relevant functions into a class
//if this goes well, I'll probably do the same with calculator.js and dice.js

import sqlite3 from 'sqlite3';

export class CommandArray {

	#db;//the database holding all the custom commands

	constructor() {

		//connect the db to the program so we can access the little bugger
		this.#db = new sqlite3.Database('G:/sqlite3/test.db', (err) => {
			if (err) console.error(err);
			console.log("* Connected to on-disk SQLite DB");
		});
	}

	//allows for the mods and the streamer to create a command and then write it to file for safe keeping
	//currently only allows for message commands, next iteration should allow for moderator commands if possible
	//@param   user       The username of the chat member that typed in the command
	//@param   inputMsg   The array of words sent in as a message to the chatroom
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

	//removes a command from the list of custom commands
	//@param   command      The command that needs to be deleted
	//@param   is_interval   Tells us if the command that needs to be deleted is one that is called on an interval
	removeCommand(command, is_interval) {

		//determine if this command is freely callable or called on an interval (different tables for them)
		const del_sql = !is_interval ? `DELETE FROM stdcommands WHERE name = ?;` : `DELETE FROM intervalcommands WHERE name = ?;`;

		return new Promise((resolve, _reject) => {
			this.#db.run(del_sql, command, (err) => {
				if (err) {
					// client.say(target, `@${user.username}: Could not find specific command to delete`);
					// console.error(err);
					resolve(`Could not find specific command to delete`);
					console.error(err);
				} else {
					// client.say(target, `@${user.username}: Command successfully deleted from database`);
					resolve(`Command successfully deleted from database`);
				}
			});
		})

	}

	//edits the message of the command
	//@param   user         The name of the chat member that typed in the command
	//@param   target       The chatroom that the message will be sent into
	//@param   client       The Twitch chat client we will send the message through
	//@param   command      The command that needs to be deleted
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
					//client.say(target, `@${user.username}: Could not find command to edit`);
					console.error(err);
					resolve('Could not find command to edit');
				} else {
					//client.say(target, `@${user.username}: Command successfully updated in database`);
					resolve('Command successfully updated in database');
				}
			});
		});
    }

	//prints out a list of all custom created commands for use
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

	//gets a command for the interval message loop with provided index
	//@param   index   The provided index for getting the message
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

	//resets the index of the command we're getting for the interval messages
	//@param   index   The index we're checking out
	//@return          A promise containing the new index
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

	//gets and updates the amount of times my voice has cracked on stream
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

	//updates the death count for when I play a difficult game and/or just bad at games
	//syntactically similar to above function for voice cracks
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

	//sets the death counts for a game back to zero
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

	//fetches the custom commands stored in the database for posting in the chat room
	//@param   command      The command we are searching the db for
	getCustomCommand(command) {
		return new Promise((resolve, _reject) => {
			//Go into the db and find what we are looking for here
			//i.e. search each found row and post out the message it has
			this.#db.get(`SELECT name, msg FROM stdcommands WHERE name = ?;`, [command], (err, row) => {
				//error would be that command does not exist, so we don't print that
				//otherwise the terminal would be crowded with those messages
				if (err) resolve('');
				else if (row == undefined) resolve('');
				else resolve(row.msg);
			});
		});
    }

	//refreshing function, gets a specific item from the DB as we need it
	//@param   index   Tells us what item we are needing from the DB specifically
	//@return          Our requested item, packaged into a Promise
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

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
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

	//gets all the info needed to get a key from Spotify's OAuth via the DB
	//returns     An array with all the necessary items stuffed inside it
	getSpotifyInfo(index) {
		let item;
		switch(index) {
			case 0:
				item = "access_token";
				break;
			case 1:
				item = "refresh_token";
				break;
			case 2:
				item = "client_id, client_secret, redirect_url, scope, state";
				break;
		}

		const spotify_sql = `SELECT ${item} FROM spotify_auth;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(spotify_sql, (err, row) => {
				if (err) reject(err); else {
					let arr = ["","","","",""];
					arr[0] = row["client_id"];
					arr[1] = row["client_secret"];
					arr[2] = row["redirect_url"];
					arr[3] = row["scope"];
					arr[4] = row["state"];
					resolve(arr);
				}

			});
		});
	}

	//refreshing function, gets the client id and secret of the bot so we can use the Helix API
	//@return           An array of two items, the client secret and the client id
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

	//refreshing function, writes the new tokens to DB after they are gathered from the API
	//@param   access_token    The new access token we need to access anything on the Helix API
	//@param   refresh_token   The new refresh token we need to get a new access token when it expires eventually
	writeTwitchTokensToDB(access_token, refresh_token) {
		const update_sql = "UPDATE twitch_auth SET access_token = ?, refresh_token = ?;";

		this.#db.run(update_sql, [access_token, refresh_token], (err) => {
			if (err) console.error(err); else console.log("* New Twitch Tokens written to DB successfully!");
		});
	}

	//gets an API key for the requested API
	//@param   key_to_get   Number that tells us which key we need at the moment
	//@return               A new Promise containing the API key
	getAPIKeys(key_to_get) {
		let key;
		switch(key_to_get) {
			case 0:
				key = 'open_ai';
				break;
			case 3:
				key = 'nasa';
				break;
		}

		const keys_sql = `SELECT ${key} FROM api_keys;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(keys_sql, (err, row) => {
				if(err) reject(err); else resolve(row[key]);
			});
		});
	}

	//refreshing function similar to writeTwitchTokensToDB, but for Spotify instead
	//@param   access_token    The new access token we need to access anything on Spotify's Web API
	//@param   refresh_token   The new refresh token we need to get a new access token when it expires eventually
	writeSpotifyTokensToDB(access_token, refresh_token) {
		const update_sql = "UPDATE spotify_auth SET access_token = ?, refresh_token = ?;";

		this.#db.run(update_sql, [access_token, refresh_token], (err) => {
			if (err) console.error(err); else console.log("* New Spotify Tokens Written Successfully!");
		});
	}

	//looks for the finetune_id provided to the function inside of the db
	//@param   id        The finetune_id for OpenAI's Fine Tuning API
	//@param   channel   The name of the channel we may or may not have a fine tuning made for
	//@returns           True/False depending on if the finetune_id is present in the db
	searchForFineTuneID(id) {

		const search_sql = `SELECT filename FROM fine_tune WHERE filename = ?;`;

		return new Promise((resolve, reject) => {
			this.#db.get(search_sql, [id],  (err, row) => {
				if (err) reject(err);
				else {
					if (row != undefined)
						if (row.filename != undefined) resolve(false);
						else resolve(true);
					else resolve(true);
				}
			});
		});
	}

	//gets the file id for the fine tuning job for a specific channel
	//@param   channel   The name of the channel we are making a model for
	//@returns           Promise with the file id inside
	getFineTuneFileID(channel) {

		const search_sql = `SELECT filename FROM fine_tune WHERE channel = ?;`;

		return new Promise((resolve, reject) => {
			this.#db.get(search_sql, [channel], (err, row) => {
				console.log(row);
				if (err) reject(err);
				else resolve(row.filename);
			});
		});
	}

	//adds the name of the fine tune model for the channel to the sqlite3 db
	//@param    model_name   The named model for the channel
	//@paramm   channel      The name of the channel we made the model for
	addFineTuneModel(model_name, channel) {

		const update_sql = `UPDATE fine_tune SET finetune_id = ? WHERE channel = ?`;

		this.#db.run(update_sql, [model_name, channel], (err) => {
			if (err) console.error(err); 
			else console.log(`* Model successfully made for ${channel}`);
		})
	}

	//adds/updates the id for the file that the fine tuning uses to train the model
	//@param   id        The file's id according to OpenAI
	//@param   channel   The name of the channel the file is attached to
	addFineTuningFileID(id, channel) {
		const update_sql = `UPDATE fine_tune SET filename = ? WHERE channel = ?;`;

		this.#db.run(update_sql, [id, channel], (err) => {
			if (err) console.error(err); else console.log(`* New file for ${channel} uploaded to OpenAI`);
		});
	}

	//gets the key and secret for the Uberduck AI TTS API
	getUberduckInfo() {
		const user_sql = 'SELECT key, secret FROM uberduck;';

		return new Promise((resolve, reject) => {
			this.#db.get(user_sql, (err, row) => {
				if (err) reject(err);
				else {
					let arr = [];
					arr.push(row.secret);
					arr.push(row.key);
					resolve(arr);
				}
			})
		});
	}
}

export default CommandArray;

