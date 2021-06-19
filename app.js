require('dotenv').config({path: './.env'});

const tmi = require('tmi.js');
const fs = require('fs');
const got = require('got');
const readline = require('readline');
const textgen = require('txtgen');
const urlValidator = require('valid-url');
const calculator = require('./calculator');
const dice = require('./dice');
const helper = require('./helper');

const opts = {
	identity: {
		username: process.env.ACCT_USERNAME,
		password: process.env.ACCT_PASSWRD
	},
	connection: {
		reconnect: true
    },
	channels: [
		"popepontus"
	]
};

const theStreamer = opts.channels[0];

//we want at least 5 lines of text to be able to make Turing-Bot
//be able to emulate chat the best it can
var linesCount = 0;

var startDate = undefined;

const apikey = process.env.OPENAI_API_KEY;

//standard template for the !addcom command, which will store mod-created commands into a JSON file to be read 
//when the bot boots up. So far, only text commands will be read for it 
//written below is just an idea of a command, not anything special
let commandTemplate = {
	name: '!stan',
	creating_mod: 'saint_isidore-bot',
	msg: 'We stan the streamer!!!!!1!!11',
};

//array for the custom commands for the streamer
var commandArray = [];

//where the prompt text for the !shitpost command will live
var prompt = "";

//simple bool variable that will disable the use of certain commands by anyone that isnt me
//(a.k.a.all commands except for !shitpost and maybe !lolrandom)

var isNeutered = false;

//vars for the !attention command
var attnCountAtStart = 0;
var lostAttention = 0;

//store which user is permitted to post links
var userPermitted = '';

//store whether or not quiet mode is enabled (the streamer will not get any @ mentions as the mod will delete them)
var isQuietTime = false;

//all the vars we need to handle using the twitch API. Its a pain in the ass.
//TODO: figure out how to actually make an authentication request for the authentication key. I have not been successful so far
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_SECRET = process.env.TWITCH_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;

//setting up the interval for telling people to follow me on Twitch, roughly every 15-20 mins or so
const commandInterval = 540000;
setInterval(followMe, commandInterval);

//interval setup to tell me how many lines of text are in testfile.txt roughly every 5 minutes or so
const linesCountInterval = 180000;
setInterval(printLinesCount, linesCountInterval);

var client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

//called every time a message gets sent in
function onMessageHandler(target, user, msg, self) {
	if (self) { return; }

	//split the message up into an array so we can see what's actually going on in it
	const inputMsg = msg.split(" ");

	//get the command name from the array as the first word in the message array
	const cmdName = inputMsg[0].toLowerCase();

	//for the list of commands, we need to make sure that we don't catch the bot's messages or it will cause problems
	if (user.username != 'Saint_Isidore_BOT') {
		//the interesting command; when called, and with enough messages posted in chat, turingbot will generate 
		//a string that should very closely mimic the average chatter's messages
		//TODO: get the invite settled from OpenAI to use GPT-3
		if (cmdName == '!shitpost') {

			if (user.mod || user.username == theStreamer || user.username == 'popepontus') {
				generateShitpost(target, user);
            }

		} else if (cmdName == "!snipsnip") {//we want to enable neutering for the product

			if (isNeutered) {
				isNeutered = true;
				client.say(target, `Bot has been neutered for testing!`);
			} else {
				isNeutered = false;
				client.say(target, `Bot has been unneutered, somehow.`);
            }

		} else if (!isNeutered) {//we are only allowing for the !shitpost command to be used if the streamer opted to neuter the bot
			if (cmdName == '!lolrandom') {//its shitposting, but only in random sentences

				client.say(target, `@${user.username}: ` + textgen.sentence());

			} else if (urlValidator.isUri(cmdName)) { //the user posted a link

				checkPermsForUser(user, target, cmdName);

			} else if (cmdName == '!isidore') {//someone wants to know who St. Isidore is

				postWikiPage(target);

			} else if (cmdName == '!permit') {//moderator wants to permit someone to post a link in the chat

				permitUser(user, target, inputMsg);

			} else if (cmdName == '!build') {//chat member wants to know the streamer's PC specs

				const buildMsg = `AMD Ryzen 5 3600 CPU, B450 Tomahawk mobo, 16 GB DDR4 RAM, EVGA GTX 1080 SC, 2.5TB Storage, 
									netis 802.11ax PCIe wireless card, USB Expansion Card, and dedicated audio card.`;
				client.say(target, `@${user.username}: ` + buildMsg);

			} else if (cmdName == '!attention') {//dumb little command for my ADHD riddled self; counts how many times I lose focus

				lostAttention++;
				client.say(target, `Streamer has fucked around ${lostAttention} times. :(`);

			} else if (cmdName == '!quiettime') {//lets the streamer not have to deal with people @-ing them; good for backseat protection

				setQuietTime(target, user);

			} else if (cmdName == '!smartass' || cmdName == '!wikirand') {//chat member wants to know about something random off wikipedia

				const url = `https://en.wikipedia.org/wiki/Wikipedia:Random`;
				client.say(target, `@${user.username}: Here's a link to a random wikipedia page. Have Fun! ${url}`);

			} else if (cmdName == '!help') {//sends a list of commands when the user needs them. Needs to be reworked to not be as garbo

				getHelp(target, user);

			} else if (cmdName.substring(0, 5) == '!roll') {//simple dice rolling command. Can do many sided dice, not just a d20 or d6

				dice.getDiceRoll(target, user, cmdName, client);

			} else if (cmdName == '!bonk') {//someone acted horny on main and needed to be sent ot solitary confinement for their sins

				//get the sinner's name so they can be punished accordingly, then time them out
				getBonked(target, user, inputMsg[1]);

			} else if (cmdName == '!uptime') {//user wants to know how long the stream has been going for

				//TODO: figure out how to set the bot to start up on pressing start stream button on OBS
				//this does not use the twitch API at all, so we have to run it on a bit of a scuffed manner. 
				getUptime(target, user);

			} else if (cmdName == '!calc' || cmdName == '!calculate' || cmdName == '!math') {//chat member wants to do basic math with the bot

				const msg = `@${user.username}: ` + ` ` + calculator.calculate(calculator.convertToRPN(helper.combineInput(inputMsg)));
				client.say(target, msg);

			} else if (cmdName == '!addcom') {//allow for a moderator/the streamer to add in a new command that writes to a JSON file

				createAndWriteCommandsToFile(target, user, inputMsg);

			} else if (cmdName == "!streamertime") {//gets the current time in Central Standard Time (CST)

				getCurrentTime(target, user);

			} else {

				var commandFound = false;

				if (isQuietTime) {//check for quiet time enabled and handle from there

					checkMsgForMention(target, user, inputMsg);

				} else {//check to make sure that the message is a user-created command from commands.json

					//checking to make sure that the command is a custom defined one
					for (var i = 0; i < commandArray.length; ++i) {
						if (cmdName == commandArray[i].name) {
							client.say(target, `@${user.username}: ${commandArray[i].msg}`);
							commandFound = true;
						}
					}

				}
				//this is not a command line, so we just gather the comment into a file
				writeMsgToFile(cmdName, target, user, msg, commandFound);
            }
        } else {//we don't know what this is, so we are going to go through other sources to verify what it actually is

			var commandFound = false;

			if (isQuietTime) {//check for quiet time enabled and handle from there

				checkMsgForMention(target, user, inputMsg);

			} else {//check to make sure that the message is a user-created command from commands.json

				//checking to make sure that the command is a custom defined one
				for (var i = 0; i < commandArray.length; ++i) {
					if (cmdName == commandArray[i].name) {
						client.say(target, `@${user.username}: ${commandArray[i].msg}`);
						commandFound = true;
                    }
				}

			}
			//this is not a command line, so we just gather the comment into a file
			writeMsgToFile(cmdName, target, user, msg, commandFound);
		}
    }
	
}

//lets me know that the script has connected to twitch servers for their API
function onConnectedHandler(addy, prt) {
	loadAttention();
	loadInCreatedCommands();

	readFileLines();

	//read in the contents of testfile.txt as soon as the bot is up and running
	fs.readFile('./data/testfile.txt', 'utf8', function (err, data) {
		if (err) {
			console.error(err);
		}
		prompt = data.toString();
	});

	startDate = new Date();
	console.log(`* Connected to ${addy}:${prt}`);

	console.log(`Bot neutered for this session?: ${isNeutered}`);
}

//gets the lines written in testfile.txt and sets the counts into the linesCount variable
function readFileLines() {
	var rl = readline.createInterface({
		input: fs.createReadStream('./data/testfile.txt'),
		output: process.stdout,
		terminal: false
	});

	rl.on('line', function (line) {
		linesCount++;
	});
	rl.on('close', function (line) {
		console.log(`* File contained ${linesCount} lines of text!`);
		fs.close(0);
	});
}

//allows for the mods and the streamer to create a command and then write it to file for safe keeping
//currently only allows for message commands, next iteration should allow for moderator commands if possible
function createAndWriteCommandsToFile(target, user, inputMsg) {

	//check to make sure the user making the command is a moderator or the streamer
	if (user.mod || user.username == theStreamer) {
		commandTemplate.creating_mod = user.username;
		commandTemplate.name = inputMsg[1];
		commandTemplate.msg = "";//safety measure to avoid there being any messages overlapping each other/wrong messages

		//add in the remaining elements of the message to the command message variable
		for (var i = 2; i < inputMsg.length; ++i) {
			commandTemplate.msg += inputMsg[i] + " ";
		}

		//push the command to the array and create a pretty-printed JSON object from the array
		commandArray.push(commandTemplate);
		const data = JSON.stringify(commandArray, null, 4);

		//write the array to file and let the user know the write was a success
		fs.truncate('./data/commands.json', 0, function () {
			fs.writeFile('./data/commands.json', data, 'utf8', function (err) {
				if (err) {
					console.error(err);
				} else {
					client.say(target, `@${user.username}: Command created successfully!`);
				}
			});
		});
	} else {
		client.say(target, `@${user.username}: You must be a moderator or the streamer to make a command`);
    }


}

//small function to remind people to follow me if they enjoy me
function followMe(target) {
	client.say(target, `If you are enjoying the stream, feel free to follow @popepontus here on Twitch!`);
}

//function to log out how many lines of text are in testfile.txt when called
function printLinesCount() {
	console.log(`Lines now in testfile.txt: ${linesCount}`);
}

//loads in the mod/streamer created commands from a JSON file and parses it into an array for easy searching
function loadInCreatedCommands() {
	fs.readFile('./data/commands.json', 'utf8', (err, data) => {

		if (err) {
			console.error(err);
		} else {
			commandArray = JSON.parse(data);
        }

	});
}

//gets the current time in Central Standard Time in AM/PM configuration
function getCurrentTime(target, user) {
	const curTime = new Date();
	var isAM = false;

	//calculate the hours in military configuration
	const unflooredHours = (curTime.getTime() / 1000) / 3600;
	const flooredHours = Math.floor(unflooredHours);
	const militaryHours = (flooredHours % 24) - 5;

	var trueHours = 0;

	//figure out what the military time converts to in standard configuration
	if (militaryHours > 0 && militaryHours <= 12) {
		trueHours = militaryHours;
		isAM = true;
	} else if (militaryHours > 12) {
		trueHours = militaryHours - 12;
		isAM = false;
	} else if (militaryHours == 0) {
		trueHours = 12;
		isAM = true;
	}

	//calculate the minutes, craft the message, and then send to chat
	const mins = Math.round((unflooredHours - flooredHours) * 60);
	var msg = `@${user.username}: Currently ${trueHours}:${mins % 60}`;
	if (isAM) {
		msg += ` A.M. `;
	} else {
		msg += ` P.M. `;
	}
	msg += `CST for the streamer`;
	client.say(target, msg);
}

//a scuffed version of a standard uptime command. In reality, gets uptime of the BOT and not the streamer
//for best results, start this at roughly the same time as starting stream for a more accurate uptime
function getUptime(target, user) {
	const currentDate = new Date();
	var difference = (currentDate.getTime() - startDate.getTime()) / 1000;
	const unflooredHours = difference / 3600;
	const flooredHours = Math.floor(unflooredHours);
	const mins = Math.round((unflooredHours - flooredHours) * 60);
	const secs = Math.round((unflooredHours - flooredHours) * 3600);
	client.say(target, `@${user.username}: ${flooredHours} hours ${mins % 60} minutes ${secs % 60} seconds`);
}

//enables quiet time when needed
function setQuietTime(target, user) {
	if (user.mod || user.username == theStreamer) {//make sure that the requesting party is a moderator or the streamer
		if (!isQuietTime) {//we want to enable it
			isQuietTime = true;
			client.say(target, `Quiet Time Enabled. All messages that are @-ing the streamer will be removed from chat until this mode is turned off`);
		} else {//we want to disable it
			isQuietTime = false;
			client.say(target, `Quiet Time Disabled. You may now bug the streamer >:)`);
		}
	}
}

//checks a message to see if it mentions the streamer's name; done so when quiet time is enabled
function checkMsgForMention(cmdName, target, user, inputMsg) {//activated when quiet time is enabled by the streamer, checks for anyone trying to @ them
	for (var i = 0; i < inputMsg.length; ++i) {
		if (inputMsg[i] == ('@' + theStreamer)) {
			client.timeout(target, user.username, 1, `Please do not @ the streamer rn, they need to not be bothered.`);
			client.say(target, `@${user.username}: Please no talking during quiet time (Quiet Time Enabled; No @-ing the streamer).`);
			return;
        }
	}
}

//sends a help message when command is typed in, with different methods depending on whether or not the asking user is a mod or just a chat memeber
function getHelp(target, user) {
	if (!user.mod) {
		client.say(target, `Available commands: !shitpost, !isidore, !build, !attention, !wikirand, !smartass, !roll#d##, !calc, !calculate, !math`);
	} else {
		client.whisper(user.username, `In addition to the other commands, you have !permit and !bonk at your service`);
	}
}

//posts the wikipedia article for Isidore of Seville when command is input
function postWikiPage(target) {

	//wikipedia link just for reference
	const s = `https://en.wikipedia.org/wiki/Isidore_of_Seville`;

	client.say(target, `Saint Isidore is the Patron Saint of the Internet and is why I named this bot: ${s}`);
}

//adds a user's name to the permitted var for link posting
function permitUser(user, target, inputMsg) {

	//check to see if the user is a moderator or the streamer, do nothing otherwise
	//process the streamer's name
	//TODO: make it so that the bot searches for the name in the channels array in opts, instead of hard coding
	if (user.mod == true || user.username == theStreamer) {
		userPermitted = inputMsg[1].toLowerCase();
		client.say(target, `${inputMsg[1]} is allowed to post one link`);
		console.log(`* New permitted user: ${userPermitted}`);
	}
}

//function for checking to see if the user is permitted to post links, and remove links if so
function checkPermsForUser(user, target, cmdName) {
	//if the user has been granted permissions to post a link, or they're the streamer, we allow them to do so
	//and then take away their permission afterwards. Otherwise, we remove the message and post a message of our own
	if (user.username == userPermitted) {
		console.log(`* Permitted User: ${user.username}`);
		userPermitted = '';
	} else if (user.username != opts.channels[0].slice(1) && user.mod == false) {//the user was not permitted, so remove it with a one second timeout
		client.timeout(target, user.username, 1, "Stop Posting Links Without Permission Please");
		client.say(target, `@${user.username}: No Posting links without permission please`);
		console.log(`* Message from ${user.username} removed. Contents: ${cmdName}`);
	}
}

//function to handle the various non-command messages on chat for storing and using with !shitpost
function writeMsgToFile(commandName, target, user, msg, foundCmd) {
	if (commandName.substring(0, 1) == '!' && !foundCmd) {//they wrote a command not featured on this bot
		client.say(target, `Unknown or unsupported command @${user.username}`);
	} else if (user.username != theStreamer) { //the text was not typed by the streamer, so we store their command
		try {
			fs.writeFile('/Users/Tyler/Documents/testfile.txt', msg + '\n',
				{ flag: 'a+' }, err => { });
			prompt += msg + '\n';
			linesCount += 1;
			//check to see if the counts for the !attention command has changed at all
			//if so, write it to file. Otherwise, do nothing
			if (lostAttention > attnCountAtStart) {
				//truncate and then write to file to overwrite the old contents
				fs.truncate('./data/attention.txt', 0, function () {
					fs.writeFile('./data/attention.txt', lostAttention.toString(),
						{ flag: 'a+' }, err => { });
				});
			}
		} catch (err) {
			console.error(err);
		}
	}
}

//times out the hornyposter and removes thier pollution from the chat room
function getBonked(target, user, userToBePunished) {
	//make sure the one doing the banning is in fact a mod or streamer and not someone lying through their teeth
	if (user.mod == true || user.username == theStreamer) {
		client.say(target, `@${userToBePunished} has been weighed and found wanting. (No Hornyposting)`);
		client.timeout(target, userToBePunished, 15, "NO HORNYPOSTING IN MY CATHOLIC CHAT")
	}
}

//when the bot is connected, we call this function to write in the attention counts to memory
function loadAttention() {
	try {
		//check to make sure that the file actually exists at the specified path first before we attempt to read it
		if (fs.existsSync('./data/attention.txt', (exists) => {
				console.log(exists ? 'Exists' : 'Doesnt Exist');
		})) {
			//read in the file to a var for processing
			const attentionFileContents = fs.readFileSync('/Users/Tyler/Documents/attention.txt', 'utf8');
			//set the counts before anyone increases them
			//for the beginning counts, if the file had nothing in it, set the starting count at 0
			if (attentionFileContents.length == 0) {
				attnCountAtStart = 0;
			} else {//otherwise, parse the string value from the file as an int
				attnCountAtStart = parseInt(attentionFileContents);
			}
			//now set the editable counts
			lostAttention = attnCountAtStart;
			console.log(`* Attention counts loaded and ready for modification on stream :)`);
		}
	} catch (err) {
		console.error(err);
    }
	
}

//soon to be fully implemented function that will shitpost and prove that a robot can emulate twitch chat easy
async function generateShitpost(target, user) {
	if (linesCount >= 5) {//we have enough lines of text to prompt GPT-3

		//the url for GPT-3 for the model level; we will use the most powerful, Davinci
		const url = 'https://api.openai.com/v1/engines/curie/completions';
		
		//we are getting access to the model through simple https requests, so we will use the Got library to do so
		try {

			//set up the parameters for the model, which will be:
			//  - prompt: input text (so just the logs from the chat)
			//  - max_tokens: how long the response is 
			//  - temperature: the level of creative freedom for responses
			//  - frequency_penalty: how much effort the model will have in not repeating itself (0 - 1)
			//  - presence_penalty: the effort the model will make for intro-ing new topics (0 - 1)
			const params = {
				"prompt": prompt,
				"max_tokens": 20,
				"temperature": 0.7,
				"frequency_penalty": 0.3,
				"presence_penalty": 0.3,
			};

			//the headers, which is effectively the APi key for GPT-3 to be sent for model access
			const headers = {
				'Authorization': `Bearer ${apikey}`,
			};

			client.say(target, `@${user.username}: ${(await got.post(url, { json: params, headers: headers }).json()).choices[0].text}`);
		} catch (err) {//in case of a screwup, post an error message to chat and print error
			client.say(target, `Error in text generation`);
			console.error(err);
		}

	} else {
		client.say(target, `Sorry, Not Enough Comments Yet :(`);
	}

}