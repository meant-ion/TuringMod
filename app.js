require('dotenv').config({ path: './.env' });

const tmi = require('tmi.js');
const fs = require('fs');
const readline = require('readline');
const Twitch = require('simple-twitch-api');
const calculator = require('./calculator.js');
const helper = require('./helper');
const loader = require('./command_loader.js');
const lrk = require('./lurker_list.js');
const AsyncHolder = require('./asyncer.js');
const dicee = require('./dice.js');

const opts = {
	identity: {
		username: process.env.ACCT_USERNAME,
		password: process.env.ACCT_PASSWRD
	},
	connection: {
		reconnect: true
	},
	channels: [//I'm really the only one going to use this tbh, so I'll just have the name be here
		"pope_pontus"
	]
};

//for getting the access token from Helix
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const scope = "user:read:email";

var startTime = new Date();
var streamTitle = '';

var stream_info = undefined;

const theStreamer = opts.channels[0];

var outside_token = undefined;

//get access to the Helix API for twitch and get all wanted chunks of info for it too
Twitch.getToken(client_id, client_secret, scope).then(async result => {
	var access_token = result.access_token;

	let user = await Twitch.getUserInfo(access_token, client_id, theStreamer);
	let user_id = user.data[0].id;

	stream_info = await Twitch.getStream(access_token, client_id, user_id);

	startTime = new Date(stream_info.data[0].started_at);
	streamTitle = stream_info.data[0].title;

	outside_token = access_token;

	console.log(`* Token generated for Helix API`);
});

//we want at least 5 lines of text to be able to make Turing-Bot
//be able to emulate chat the best it can
var linesCount = 0;

//vars for the !voice command
var vCrackCountAtStart = 0;
var voiceCrack = 0;

//interval setup to tell me how many lines of text are in testfile.txt roughly every 5 minutes or so
//const linesCountInterval = 180000;
//setInterval(printLinesCount, linesCountInterval);

var client = new tmi.client(opts);

client.connect();

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

//setting up the interval for telling people to follow me on Twitch, roughly every 15-20 mins or so
const commandInterval = 900000;
setInterval(followMe, commandInterval);
setInterval(suggestToMe, commandInterval + 100000);

//generate the custom objects for the special commands and the !lurk/!unlurk features and other necessary classes
let commands_holder = new loader(theStreamer);
let lurk_list = new lrk();
let async_functions = new AsyncHolder(client, theStreamer);
let dice = new dicee(theStreamer, client);
let Calculator = new calculator();

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
		if (cmdName == '!post') {

			//if (user.mod || user.username == theStreamer || user.username == 'pope_pontus') {
			//	generateShitpost(target, user);
			//}

			client.say(target, `Due to my developer's incompetence, I no longer have an API key for shitposting! So this is what you get. Sorry`);

		} else if (cmdName == '!isidore') {//someone wants to know who St. Isidore is

			postWikiPage(target);

		} else if (cmdName == '!follow') {//to be run every so often to let people know to follow me

			followMe();

		} else if (cmdName == '!lurk') {//the user wishes to enter lurk mode

			client.say(target, lurk_list.addLurker(user));

		} else if (cmdName == '!unlurk') {//the user wishes to exit lurk mode

			client.say(target, lurk_list.removeLurker(user));

		} else if (cmdName == '!addcommand') {//for mods to add a custom command

			commands_holder.createAndWriteCommandsToFile(client, target, user, inputMsg);

		} else if (cmdName == '!removecommand') {//for mods to remove a custom command

			commands_holder.removeCommand(client, target, user, inputMsg[1]);

		} else if (cmdName == '!customlist') {//gets a list of all custom commands on the channel

			commands_holder.postListOfCreatedCommands(client, target, user);

		} else if (cmdName == '!followage') {//user wants to know how long they've followed the stream

			async_functions.getFollowAge(client_id, outside_token, user);

		} else if (cmdName == '!so') {//streamer/moderators wish to give a shoutout to a user in chat
			if (inputMsg.length > 1 && (user.mod || user.username == theStreamer)) {
				client.say(target, `Please check out and follow this cool dude here! https://www.twitch.tv/${inputMsg[1]}`);
			}

		} else if (cmdName == '!suggestion') {//a chatmember has a suggestion on what to add to the bot

			if (writeSuggestionToFile(inputMsg)) {
				client.say(target, `@${user.username}, your suggestion has been written down. Thank you!`);
			}

		} else if (cmdName == '!suggestionlist') {//the user wants to see all of the current suggestions for the bot

			async_functions.printAllSuggestions(user);

		} else if (cmdName == '!title') {//tells asking user what the current title of the stream is

			client.say(target, `@${user.username} Title is: ${streamTitle}`);

		} else if (cmdName == '!roulette') {//allows chat member to take a chance at being timed out

			takeAChanceAtBeingBanned(target, user);

		} else if (cmdName == '!build') {//chat member wants to know the streamer's PC specs

			const buildMsg = `AMD Ryzen 5 3600 CPU, B450 Tomahawk mobo, 16 GB DDR4 RAM, EVGA GTX 1080 SC, 2.5TB Storage, 
netis 802.11ax PCIe wireless card, USB Expansion Card, and dedicated audio card.`;
			client.say(target, `@${user.username}: ` + buildMsg);

		} else if (cmdName == '!voice') {//dumb little command for whenever my voice cracks, which is apparently often

			voiceCrack++;
			client.say(target, `Streamer's voice has cracked ${lostAttention} times.`);

		} else if (cmdName == '!wikirand') {//chat member wants to know about something random off wikipedia

			async_functions.getRandWikipediaArticle(user);

		} else if (cmdName == '!help') {//sends a list of commands when the user needs them. Needs to be reworked to not be as garbo

			getHelp(target, user);

		} else if (cmdName.substring(0, 5) == '!roll') {//simple dice rolling command. Can do many sided dice, not just a d20 or d6

			dice.getDiceRoll(cmdName, user);

		} else if (cmdName == '!uptime') {//user wants to know how long the stream has been going for

			getUptime(target, user);

		} else if (cmdName == '!calc') {//chat member wants to do basic math with the bot

			const msg = `@${user.username}: ` + ` ` + Calculator.calculate(helper.combineInput(inputMsg));
			client.say(target, msg);

		} else if (cmdName == "!streamertime") {//gets the current time in Central Standard Time (CST)

			getCurrentTime(target, user);

		} else if (cmdName == '!commands') {//user wants to know what commands they have without going to the github page

			var msg = `@${user.username}: !post, !isidore, !follow, !title, !followage, !roulette, !calc, !help, !wikirand, !roll, 
!uptime, !streamertime, !customlist, !suggestion, !lurk, !unlurk. For what they do, type !help for the command descriptions`;
			client.say(target, msg);

		} else {
			//check to see if the message is a custom command
			var msg = commands_holder.searchForCommand(cmdName);
			if (msg != null) {
				client.say(target, msg);
			} else {
				//this is not a command line, so we just gather the comment into a file
				lurkerHasTypedMsg(target, user);
				writeMsgToFile(user, msg);
            }
		}
	}
}

//lets me know that the script has connected to twitch servers for their API
function onConnectedHandler(addy, prt) {
	loadVoiceCrack();

	readFileLines();

	//read in the contents of testfile.txt as soon as the bot is up and running
	fs.readFile('./data/testfile.txt', 'utf8', function (err, data) {
		if (err) {
			console.error(err);
		}
		prompt = data.toString();
	});

	console.log(`* Connected to ${addy}:${prt}`);

}

//if the user types again as a lurker, we display that they unlurked from chat
function lurkerHasTypedMsg(target, user) {
	let lurkMsg = lurk_list.removeLurker(user);
	if (lurkMsg != `You needed to be lurking already in order to stop lurking @${user.username}`) {
		client.say(target, lurkMsg);
    }
}


//appends a suggestion from a viewer to a suggestions file for later consideration
function writeSuggestionToFile(inputMsg) {

	//compile the message into a single string for better insertion into file
	let compiledMsg = ""
	for (var i = 1; i < inputMsg.length; ++i) {
		compiledMsg += inputMsg[i] + " ";
	}

	fs.appendFile('./data/suggestions.txt', compiledMsg + '\n', (err) => {
		if (err) {
			console.error(err);
        }
	});

	return true;
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

//small function to remind people to follow me if they enjoy me
function followMe() {
	client.say(theStreamer, `If you are enjoying the stream, feel free to follow @pope_pontus here on Twitch!`);
}

//small function to let viewers know that they can suggest edits to the bot at any time the stream is up
function suggestToMe() {
	client.say(theStreamer, `If you have any suggestions on what should be added to me, send them over using !suggestion and then
what you think is a good idea. Thank you!`);
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
	msg += `CDT for the streamer`;
	client.say(target, msg);
}

//like Russian Roulette, but with timeouts instead of actual bullets
function takeAChanceAtBeingBanned(target, user) {
	const willTheyBeBanned = Math.random() * (1000 - 1) + 1;
	if (willTheyBeBanned >= 990) {
		client.say(target, `How very unfortunate`);
		client.timeout(target, user.username, 10);
	} else {
		client.say(target, `Lucky you!`);
    }
}

//uptime command that gets how long the streamer has been live
function getUptime(target, user) {
	let timeMsg = helper.getTimePassed(startTime, false);
	client.say(target, `@${user.username}: ${timeMsg}`);
}

//sends a help message when command is typed in, with different methods depending on whether or not the asking user is a mod or just a chat memeber
function getHelp(target, user) {
	client.say(target, `@${user.username}: A list of commands for me can be found on my GitHub Repo! 
https://github.com/meant-ion/TuringMod/blob/master/README.md`)
}

//posts the wikipedia article for Isidore of Seville when command is input
function postWikiPage(target) {

	//wikipedia link just for reference
	const s = `https://en.wikipedia.org/wiki/Isidore_of_Seville`;

	client.say(target, `Saint Isidore is the Patron Saint of the Internet and is why I named this bot: ${s}`);
}

//function to handle the various non-command messages on chat for storing and using with !shitpost
function writeMsgToFile(user, msg) {
	 if (user.username != theStreamer) { //the text was not typed by the streamer, so we store their command
		 try {
			//4 lines commented out b/c useless w/o working shitpost function
			//fs.writeFile('./data/testfile.txt', msg + '\n',
			//	{ flag: 'a+' }, err => { });
			//prompt += msg + '\n';
			//linesCount += 1;
			//check to see if the counts for the !attention command has changed at all
			//if so, write it to file. Otherwise, do nothing
			if (voiceCrack > vCrackCountAtStart) {
				//truncate and then write to file to overwrite the old contents
				fs.truncate('./data/attention.txt', 0, function () {
					fs.writeFile('./data/attention.txt', voiceCrack.toString(),
						{ flag: 'a+' }, err => { });
				});
			}
		} catch (err) {
			console.error(err);
		}
	}
}

//when the bot is connected, we call this function to write in the attention counts to memory
function loadVoiceCrack() {
	try {
		//check to make sure that the file actually exists at the specified path first before we attempt to read it
		if (fs.existsSync('./data/attention.txt', (exists) => {
			console.log(exists ? 'Exists' : 'Doesnt Exist');
		})) {
			//read in the file to a var for processing
			const attentionFileContents = fs.readFileSync('./data/attention.txt', 'utf8');
			//set the counts before anyone increases them
			//for the beginning counts, if the file had nothing in it, set the starting count at 0
			if (vCrackCountAtStart.length == 0) {
				attnCountAtStart = 0;
			} else {//otherwise, parse the string value from the file as an int
				attnCountAtStart = parseInt(attentionFileContents);
			}
			//now set the editable counts
			voiceCrack = attnCountAtStart;
			console.log(`* Voice Crack counts loaded and ready for modification on stream :)`);
		}
	} catch (err) {
		console.error(err);
	}
}