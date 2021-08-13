//the generated class for loading commands from file and creating new ones
//trying something different with this one, in stuffing the relevant functions into a class
//if this goes well, I'll probably do the same with calculator.js and dice.js

const fs = require('fs');

class CommandArray {

	#commandArray;//the array to hold the commands when loaded into file
	#commandTemplate;

	constructor() {

		this.#commandArray = [];

		//write in relevant data into commandArray
		fs.readFile('./data/commands.json', 'utf8', (err, data) => {

			if (err) {
				console.error(err);
			} else {
				var b4array = JSON.parse(data);
				for (var i = 0; i < b4array.length; ++i) {
					this.#commandArray.push(b4array[i]);
                }
				console.log("* Commands Loaded in from file and ready to go!");
			}

		});

		//standard template for the !addcom command, which will store mod-created commands into a JSON file to be read 
		//when the bot boots up. So far, only text commands will be read for it 
		//written below is just an idea of a command, not anything special or serious, just a template
		this.#commandTemplate = {
			name: '!stan',
			creating_mod: 'saint_isidore-bot',
			msg: 'We stan the streamer!!!!!1!!11',
		};
	}

	//allows for the mods and the streamer to create a command and then write it to file for safe keeping
	//currently only allows for message commands, next iteration should allow for moderator commands if possible
	createAndWriteCommandsToFile(client, target, user, inputMsg, isEdit) {
		this.#commandTemplate.creating_mod = user.username;
		this.#commandTemplate.name = inputMsg[1];
		this.#commandTemplate.msg = "";//safety measure to avoid there being any messages overlapping each other/wrong messages

		//add in the remaining elements of the message to the command message variable
		for (var i = 2; i < inputMsg.length; ++i) {
			this.#commandTemplate.msg += inputMsg[i] + " ";
		}

		//push the command to the array and create a pretty-printed JSON object from the array
		this.#commandArray.push(this.commandTemplate);
		const data = JSON.stringify(this.#commandArray, null, 4);

		//write the array to file and let the user know the write was a success
		fs.truncate('./data/commands.json', 0, function () {
			fs.writeFile('./data/commands.json', data, 'utf8', function (err) {
				if (err) {
					console.error(err);
					client.say(target, `@${user.username}: Error in writing command to file`);
				} else {
					if (!isEdit) {
						client.say(target, `@${user.username}: Command Created Successfully!`);
                    }
				}
			});
		});
	}

	//removes a command from the list of custom commands
	removeCommand(client, target, user, command) {
		if (this.searchForCommand(command) != null) {

			this.#commandArray = this.#commandArray.filter(item => item.name != command);
			const data = JSON.stringify(this.#commandArray, null, 4);

			fs.truncate('./data/commands.json', 0, function () {
				fs.writeFile('./data/commands.json', data, 'utf8', function (err) {
					if (err) {
						console.error(err);
						client.say(target, `@${user.username} failed to remove command`);
					} else {
						client.say(target, `@${user.username} command removed successfully`);
					}
				});
			});
		}
	}

	//edits the message of the command
	editCommand(client, target, user, inputMsg) {

		var commandToEdit = inputMsg[1];
		var oldMsg = this.searchForCommand(commandToEdit);
		
		if (oldMsg != null) {
			this.removeCommand(client, target, user, commandToEdit);
			this.createAndWriteCommandsToFile(client, target, user, inputMsg);
			client.say(target, `@${user.username}: ${commandToEdit} successfully edited`);
		} else {
			client.say(target, `@${user.username}: ${commandToEdit} does not exist`);
        }
    }

	//prints out a list of all custom created commands for use
	postListOfCreatedCommands(client, target, user) {
		var msg = `@${user.username}: These are the current custom commands available: `;
		for (var i = 0; i < this.#commandArray.length; ++i) {
			if (i != this.#commandArray.length - 1) {
				msg += this.#commandArray[i].name + ", ";
			} else {
				msg += this.#commandArray[i].name;
            }
		}
		client.say(target, msg);
    }

	//from the commandArray, we search for the requested command. If not found, return null. Else, return the message
	searchForCommand(command) {

		//checking to make sure that the command is a custom defined one
		for (var i = 0; i < this.#commandArray.length; ++i) {
			if (command == this.#commandArray[i].name) {
				return this.#commandArray[i].msg;
			}
		}
		return null;
    }
}

module.exports = CommandArray;

