//the generated class for loading commands from file and creating new ones
//trying something different with this one, in stuffing the relevant functions into a class
//if this goes well, I'll probably do the same with calculator.js and dice.js

const sqlite3 = require('sqlite3').verbose();

class CommandArray {

	#db;//the database holding all the custom commands

	constructor() {

		//connect the db to the program so we can access the little bugger
		this.#db = new sqlite3.Database('C:/sqlite3/test.db', (err) => {
			if (err) { console.error(err); }
			console.log("* Connected to on-disk SQLite DB");
		});
	}

	//allows for the mods and the streamer to create a command and then write it to file for safe keeping
	//currently only allows for message commands, next iteration should allow for moderator commands if possible
	//@param   user       The name of the chat member that typed in the command
	//@param   target     The chatroom that the message will be sent into
	//@param   client     The Twitch chat client we will send the message through
	//@param   inputMsg   The array of words sent in as a message to the chatroom
	createAndWriteCommandsToFile(client, target, user, inputMsg) {

		//determine if this command is freely callable or called on an interval (different tables for them)
		let isInterval = (inputMsg[1] == 'true');
		let ins_sql;
		if (!isInterval) {
			ins_sql = `INSERT INTO stdcommands VALUES(?,?,?);`;
		} else {
			ins_sql = `INSERT INTO intervalcommands VALUES(?,?,?);`;
        }

		//inputMsg will have form !command isInterval(t/f) cmdName(string) msg(rest of message)
		let creating_mod = user.username;
		let name = inputMsg[1];
		let msg = "";//safety measure to avoid there being any messages overlapping each other/wrong messages

		//add in the remaining elements of the message to the command message variable
		for (let i = 2; i < inputMsg.length; ++i) {
			console.log(inputMsg[i]);
			msg += inputMsg[i] + " ";
		}

		//run the sql command and spit out the result
		this.#db.run(ins_sql, [name, creating_mod, msg], (err) => {
			if (err) {
				client.say(target, `@${user.username}: Error adding command to database`);
				console.error(err);
			} else {
				client.say(target, `@${user.username}: Command successfully added to database`);
            }
			
		});
	}

	//removes a command from the list of custom commands
	//@param   user         The name of the chat member that typed in the command
	//@param   target       The chatroom that the message will be sent into
	//@param   client       The Twitch chat client we will send the message through
	//@param   command      The command that needs to be deleted
	//@param   isInterval   Tells us if the command that needs to be deleted is one that is called on an interval
	removeCommand(client, target, user, command, isInterval) {

		//determine if this command is freely callable or called on an interval (different tables for them)
		let del_sql;
		if (!isInterval) {
			del_sql = `DELETE FROM stdcommands WHERE name = ?;`;
		} else {
			del_sql = `DELETE FROM intervalcommands WHERE name = ?;`;
		}

		//run the sql command and spit out the result
		this.#db.run(del_sql, command, (err) => {
			if (err) {
				client.say(target, `@${user.username}: Could not find specific command to delete`);
				console.error(err);
			} else {
				client.say(target, `@${user.username}: Command successfully deleted from database`);
				console.log(`Rows deleted ${this.changes}`);
            }
				
		});
	}

	//edits the message of the command
	//@param   user         The name of the chat member that typed in the command
	//@param   target       The chatroom that the message will be sent into
	//@param   client       The Twitch chat client we will send the message through
	//@param   command      The command that needs to be deleted
	//@param   isInterval   Tells us if the command that needs to be deleted is one that is called on an interval
	editCommand(client, target, user, inputMsg) {

		//determine if this command is freely callable or called on an interval (different tables for them)
		let isInterval = (inputMsg[1] == 'true');
		let update_sql;
		if (!isInterval) {
			update_sql = `UPDATE stdcommands SET msg = ? WHERE name = ?;`;
		} else {
			update_sql = `UPDATE intervalcommands SET msg = ? WHERE name = ?;`;
		}

		//assemble the message to post back into place
		let commandToEdit = inputMsg[2];
		let message = "";
		for (let i = 3; i < inputMsg.length; ++i) {
			message += inputMsg[i] + " ";
		}

		//run the sql command and spit out the result
		this.#db.run(update_sql, [message, commandToEdit], (err) => {
			if (err) {
				client.say(target, `@${user.username}: Could not find command to edit`);
				console.error(err);
			} else {
				client.say(target, `@${user.username}: Command successfully updated in database`);
				console.log(`Rows updated ${this.changes}`);
			}

		});
    }

	//prints out a list of all custom created commands for use
	//@param   user         The name of the chat member that typed in the command
	//@param   target       The chatroom that the message will be sent into
	//@param   client       The Twitch chat client we will send the message through
	postListOfCreatedCommands(client, target, user) {
		let msg = `@${user.username}: These are the current custom commands available: `;

		this.#db.all('SELECT name, msg FROM stdcommands;', [], (err, rows) => {
			if (err) { console.error(err); }
			rows.forEach((row) => {
				msg += row.name + ", ";
			});
			client.say(target, msg);
		});
	}

	//gets a command for the interval message loop with provided index
	//@param   index   The provided index for getting the message
	getIntervalCommand(index, client) {
		let search_sql = `SELECT msg FROM intervalcommands;`;
		 this.#db.all(search_sql, (err, rows) => {
		 	if (err) {
		 		console.error(err);
		 	} else {
				//just using the hard-coded target channel here since this version of the bot will only be used on this channel
				client.say('#pope_pontus', rows[index].msg);
            }
         });
	}

	//resets the index of the command we're getting for the interval messages
	//@param   index   The index we're checking out
	//@return          A promise containing the new index
	async getLengthOfIntervals(index) {

		let length_sql = `SELECT COUNT(*) FROM intervalcommands;`;

		//build the promise and send it out with what we have produced
		return new Promise((resolve, reject) => {

			this.#db.get(length_sql, (err, row) => {

				if (err) { reject(err); } else {

					//send out either 0 if we reach the end of the entries in the DB, or the index + 1 otherwise
					if (row['COUNT(*)'] <= index + 1) {
						resolve(0);
					} else {
						resolve(index + 1);
					}

				}

			});
		});
	}

	//gets and updates the amount of times my voice has cracked on stream
	//@param   target       The chatroom that the message will be sent into
	//@param   client       The Twitch chat client we will send the message through
	getAndUpdateVoiceCracks(client, target) {

		let vcrack_sql = `SELECT num FROM voicecracks;`;

		//get the current count and push it out to the chat room
		this.#db.get(vcrack_sql, (err, row) => {

			if (err) { console.error(err); } else {
				console.log(row);
				let count = parseInt(row['num']) + 1;
				client.say(target, `Streamer's voice has cracked ${count} times.`);
				let update_sql = `UPDATE voicecracks SET num = ?;`

				//now we update the count by 1 and push that new count to the DB
				this.#db.run(update_sql, [count.toString()], (err) => {
					if (err) { console.error(err); } else { console.log("Voice cracks count updated"); }
				});
			}
		})

	}

	//fetches the custom commands stored in the database for posting in the chat room
	//@param   client       The Twitch chat client we will send the message through
	//@param   target       The chatroom that the message will be sent into
	//@param   command      The command we are searching the db for
	//@return               True/False depending on if the command was found
	getCustomCommand(client, target, command) {
		let search_sql = `SELECT name, msg FROM stdcommands WHERE name = ?;`;

		//Go into the db and find what we are looking for here
		//i.e. search each found row and post out the message it has
		this.#db.serialize(() => {
			this.#db.each(search_sql, command, (err, row) => {
				if (err) {
					console.error(err);
				} else if (row == undefined) {
					return false;
				} else {
					client.say(target, row.msg);
					return true;
                }	
			});
			return false;
		});
		return false;
    }

	//gets a phrase from the "magic 8 ball" and sends it to the asking user in chat
	//here in the commands array class since it uses the sqlite db just like the rest of this
	//means that I dont have to have 2 connections to the db open at a time
	//@param   user      The user who sent the command in the first place
	//@param   target    The specific chat room that the command came from
	magic8Ball(client, user, target) {
		let phrase_index = Math.floor(Math.random() * 20) + 1

		let search_sql = `SELECT saying FROM sayings WHERE id = ?;`;

		this.#db.serialize(() => {
			this.#db.each(search_sql, phrase_index, (err, row) => {
				if (err) { console.error(err); } else if (row == undefined) {
					return false;
				} else {
					client.say(target, `@${user.username}: ${row.saying}`);
					return true;
				}
			});
			return false;
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
		}

		let twitch_sql = `SELECT ${item} FROM twitch_auth;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(twitch_sql, (err, row) => {
				if(err) { reject(err); } else {
					resolve(row[item]);
				}
			});
		});
		
	}

	//gets all the info needed to get a key from Twitch's OAuth via the DB
	//returns     An array with all the necessary items stuffed inside it
	getTwitchSessionInfo() {
		let twitch_sql = `SELECT client_id, client_secret, scope, redirect_url, session_secret FROM twitch_session_stuff;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(twitch_sql, (err, row) => {
				if (err) { reject(err); } else {
					let arr = ["","","","",""];
					arr[0] = row["client_id"];
					arr[1] = row["client_secret"];
					arr[2] = row["scope"];
					arr[3] = row["redirect_url"];
					arr[4] = row["session_secret"];
					resolve(arr);
				}
			});
		});
	}

	//gets all the info needed to get a key from Spotify's OAuth via the DB
	//returns     An array with all the necessary items stuffed inside it
	getSpotifySessionInfo() {
		let spotify_sql = `SELECT client_id, client_secret, redirect_url, scope, state FROM spotify_session_stuff;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(spotify_sql, (err, row) => {
				if (err) { reject(err); } else {
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
		let twitch_sql = `SELECT client_id, client_secret FROM twitch_auth;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(twitch_sql, (err, row) => {
				if (err) { reject(err); } else {
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
		let update_sql = "UPDATE twitch_auth SET access_token = ?, refresh_token = ?;";

		this.#db.run(update_sql, [access_token, refresh_token], (err) => {
			if (err) { console.error(err); } else { console.log("New Twitch Tokens written to DB successfully!"); }
		});
	}

	//gets the Spotify Web API Token(s) from the DB so we can work with them in the app
	//@param   needBoth   Boolean to tell us if we need just the access token or both it and the refresh token
	//@return             Either just the access token outright, or a 2 element array with the access and refresh tokens
	async getSpotifyInfo(need_both) {
		let spotify_sql;
		if (!need_both) {
			spotify_sql = `SELECT access_token FROM spotify_auth;`;
		} else {
			spotify_sql = `SELECT access_token, refresh_token FROM spotify_auth`;
		}

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {

			this.#db.get(spotify_sql, (err, row) => {
				if (err) { reject(err); } else {
					if (!need_both) {//we need only the access token

						resolve(row.access_token);

					} else {//we need both tokens, so send them into an array and go from there

						let arr = ['', ''];
						arr[0] = row.access_token;
						arr[1] = row.refresh_token;
						resolve(arr);

					}
				}
			});
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
			case 1:
				key = 'dictionary';
				break;
			case 2:
				key = 'exchange_rates';
				break;
			case 3:
				key = 'nasa';
				break;
		}

		let keys_sql = `SELECT ${key} FROM api_keys;`;

		//wrap it inside of a new promise since getting it from a DB is slower than from memory (obviously)
		return new Promise((resolve, reject) => {
			this.#db.get(keys_sql, (err, row) => {
				if(err) { reject(err); } else {
					resolve(row[key]);
				}
			});
		});
	}

	//refreshing function similar to writeTwitchTokensToDB, but for Spotify instead
	//@param   access_token    The new access token we need to access anything on Spotify's Web API
	//@param   refresh_token   The new refresh token we need to get a new access token when it expires eventually
	writeSpotifyTokensToDB(access_token, refresh_token) {
		let update_sql = "UPDATE spotify_auth SET access_token = ?, refresh_token = ?;";

		this.#db.run(update_sql, [access_token, refresh_token], (err) => {
			if (err) { console.error(err); } else { console.log("New Spotify Tokens Written Successfully!"); }
		})
	}
}

module.exports = CommandArray;

