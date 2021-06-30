require('dotenv').config({ path: './.env' });

const tmi = require('tmi.js');
const fs = require('fs');
const readline = require('readline');
const Twitch = require('simple-twitch-api');
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

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const scope = "user:read:email"

var startTime = undefined;

Twitch.getToken(client_id, client_secret, scope).then(async result => {
	var access_token = result.access_token;

	let user = await Twitch.getUserInfo(access_token, client_id, "popepontus");
	console.log(user)
	let user_id = user.data[0].id;

	let stream_info = await Twitch.getStream(access_token, client_id, user_id);

	startTime = new Date(stream_info.data[0].started_at);

	console.log(stream_info.data[0]);

	console.log(`Start time as gotten from helix: ${startTime}`);
});

const theStreamer = opts.channels[0];

//we want at least 5 lines of text to be able to make Turing-Bot
//be able to emulate chat the best it can
var linesCount = 0;

//var startDate = undefined;

//simple bool variable that will disable the use of certain commands by anyone that isnt me
//(a.k.a.all commands except for !shitpost and maybe !lolrandom)

var isNeutered = false;

//vars for the !attention command
var attnCountAtStart = 0;
var lostAttention = 0;



//interval setup to tell me how many lines of text are in testfile.txt roughly every 5 minutes or so
//const linesCountInterval = 180000;
//setInterval(printLinesCount, linesCountInterval);

var client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

//setting up the interval for telling people to follow me on Twitch, roughly every 15-20 mins or so
//const commandInterval = 540000;
//setInterval(followMe('popepontus'), commandInterval);

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
		if (cmdName == '!post') {

			//if (user.mod || user.username == theStreamer || user.username == 'popepontus') {
			//	generateShitpost(target, user);
			//}

			client.say(target, `Due to my developer's incompetence, I no longer have an API key for shitposting! So this is what you get. Sorry`);

		} else if (cmdName == '!isidore') {//someone wants to know who St. Isidore is

			postWikiPage(target);

		} else if (cmdName == '!build') {//chat member wants to know the streamer's PC specs

			const buildMsg = `AMD Ryzen 5 3600 CPU, B450 Tomahawk mobo, 16 GB DDR4 RAM, EVGA GTX 1080 SC, 2.5TB Storage, 
netis 802.11ax PCIe wireless card, USB Expansion Card, and dedicated audio card.`;
			client.say(target, `@${user.username}: ` + buildMsg);

		} else if (cmdName == '!attention') {//dumb little command for my ADHD riddled self; counts how many times I lose focus

			lostAttention++;
			client.say(target, `Streamer has fucked around ${lostAttention} times. :(`);

		} else if (cmdName == '!wikirand') {//chat member wants to know about something random off wikipedia

			const url = `https://en.wikipedia.org/wiki/Wikipedia:Random`;
			client.say(target, `@${user.username}: Here's a link to a random wikipedia page. Have Fun! ${url}`);

		} else if (cmdName == '!help') {//sends a list of commands when the user needs them. Needs to be reworked to not be as garbo

			getHelp(target, user);

		} else if (cmdName.substring(0, 5) == '!roll') {//simple dice rolling command. Can do many sided dice, not just a d20 or d6

			dice.getDiceRoll(target, user, cmdName, client);

		} else if (cmdName == '!uptime') {//user wants to know how long the stream has been going for

			//TODO: figure out how to set the bot to start up on pressing start stream button on OBS
			//this does not use the twitch API at all, so we have to run it on a bit of a scuffed manner. 
			getUptime(target, user);

		} else if (cmdName == '!calc') {//chat member wants to do basic math with the bot

			const msg = `@${user.username}: ` + ` ` + calculator.calculate(calculator.convertToRPN(helper.combineInput(inputMsg)));
			client.say(target, msg);

		} else if (cmdName == "!streamertime") {//gets the current time in Central Standard Time (CST)

			getCurrentTime(target, user);

		} else {
			//this is not a command line, so we just gather the comment into a file
			writeMsgToFile(user, msg);
		}
	}
}

//lets me know that the script has connected to twitch servers for their API
function onConnectedHandler(addy, prt) {
	loadAttention();

	readFileLines();

	//read in the contents of testfile.txt as soon as the bot is up and running
	fs.readFile('./data/testfile.txt', 'utf8', function (err, data) {
		if (err) {
			console.error(err);
		}
		prompt = data.toString();
	});

	//startDate = new Date();
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

//small function to remind people to follow me if they enjoy me
function followMe(target) {
	client.say(target, `If you are enjoying the stream, feel free to follow @popepontus here on Twitch!`);
}

////function to log out how many lines of text are in testfile.txt when called
//function printLinesCount() {
//	console.log(`Lines now in testfile.txt: ${linesCount}`);
//}

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

//uptime command that gets how long the streamer has been live
function getUptime(target, user) {
	const currentDate = new Date();
	var difference = (currentDate.getTime() - startTime.getTime()) / 1000;
	const unflooredHours = difference / 3600;
	const flooredHours = Math.floor(unflooredHours);
	const mins = Math.round((unflooredHours - flooredHours) * 60);
	const secs = Math.round((unflooredHours - flooredHours) * 3600);
	client.say(target, `@${user.username}: ${flooredHours} hours ${mins % 60} minutes ${secs % 60} seconds`);
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

//when the bot is connected, we call this function to write in the attention counts to memory
function loadAttention() {
	try {
		//check to make sure that the file actually exists at the specified path first before we attempt to read it
		if (fs.existsSync('./data/attention.txt', (exists) => {
			console.log(exists ? 'Exists' : 'Doesnt Exist');
		})) {
			//read in the file to a var for processing
			const attentionFileContents = fs.readFileSync('./data/attention.txt', 'utf8');
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
//due to my own incompetence and lack of reading comprehension, this function no longer has an API key
//for most likely an indefinite period, this will no longer work. The code will still work with a valid key, but
//I no longer possess one. Apologies for the inconvenience
//async function generateShitpost(target, user) {
//	if (linesCount >= 5) {//we have enough lines of text to prompt GPT-3

//		//the url for GPT-3 for the model level; we will use the most powerful, Davinci
//		const url = 'https://api.openai.com/v1/engines/curie/completions';

//		//we are getting access to the model through simple https requests, so we will use the Got library to do so
//		try {

//			//set up the parameters for the model, which will be:
//			//  - prompt: input text (so just the logs from the chat)
//			//  - max_tokens: how long the response is 
//			//  - temperature: the level of creative freedom for responses
//			//  - frequency_penalty: how much effort the model will have in not repeating itself (0 - 1)
//			//  - presence_penalty: the effort the model will make for intro-ing new topics (0 - 1)
//			const params = {
//				"prompt": prompt,
//				"max_tokens": 20,
//				"temperature": 0.7,
//				"frequency_penalty": 0.3,
//				"presence_penalty": 0.3,
//				"stop": ['.', '!', '?']
//			};

//			//the headers, which is effectively the APi key for GPT-3 to be sent for model access
//			const headers = {
//				'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//			};

//			client.say(target, `@${user.username}: ${(await got.post(url, { json: params, headers: headers }).json()).choices[0].text}`);
//		} catch (err) {//in case of a screwup, post an error message to chat and print error
//			client.say(target, `Error in text generation`);
//			console.error(err);
//		}

//	} else {
//		client.say(target, `Sorry, Not Enough Comments Yet :(`);
//	}

//}