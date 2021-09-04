require('dotenv').config({ path: './.env' });

const tmi = require('tmi.js');
const fs = require('fs');
const Twitch = require('simple-twitch-api');
const calculator = require('./calculator.js');
const h = require('./helper');
const loader = require('./command_loader.js');
const lrk = require('./lurker_list.js');
const AsyncHolder = require('./asyncer.js');
const dicee = require('./dice.js');
const collector = require('./clipcollector.js');
const poster_class = require('./post.js');

const opts = {
	identity: {
		username: process.env.ACCT_USERNAME,
		password: process.env.ACCT_PASSWRD
	},
	connection: {
		reconnect: true
	},
	channels: [//I'm really the only one going to use this version, so I'll just have the name be here (for now anyway)
		"pope_pontus",
	]
};

//for getting the access token from Helix
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const scope = "user:read:email channel:manage:broadcast";
const redirect_url = process.env.REDIRECT_URL;
const session_secret = process.env.SESSION_SECRET;

const theStreamer = opts.channels[0];

let outside_token = undefined;

//get access to the Helix API for twitch and get all wanted chunks of info for it too
Twitch.getToken(client_id, client_secret, scope).then(async result => {
	var access_token = result.access_token;

	outside_token = access_token;

	console.log(`* Token generated for Helix API`);
});

//we want at least 5 lines of text to be able to make Turing-Bot
//be able to emulate chat the best it can
let linesCount = 0;
let prompt = "";

//vars for the !voice command
let vCrackCountAtStart = 0;
let voiceCrack = 0;

//what we set when we want to collect clips to be seen later
let collectClips = false;

//what we use to measure how many viewers/commenters wish to change the song currently playing (needs to be 5 and over)
//relevant command: !skipsong
let skipThreshold = 0;

let client = new tmi.client(opts);

client.connect();

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

//setting up the interval for giving people info about the streams every 15-20 mins
//note to self: when testing this for other channels, turn this function OFF to avoid getting called a shill for my own stuff
//uncomment when not testing on other's streams
setInterval(intervalMessages, 600000);

//separate variable to tell the program which function gets called
let callThisFunctionNumber = 0;

//array to hold who voted to skip a song, helps to prevent someone voting more than once per song
let skip_list = [];

//array that holds the prompt per streamer. I.E. key == target, value == prompt for !post
let prompt_list = [];
for (i in opts.channels) { prompt_list.push(i); }

//generate the custom objects for the special commands and the !lurk/!unlurk features and other necessary classes
let commands_holder = new loader();
let helper = new h();
let lurk_list = new lrk();
let async_functions = new AsyncHolder(client, client_id, client_secret, scope, redirect_url, session_secret);
let dice = new dicee(client);
let Calculator = new calculator();
let ClipCollector = new collector();
let post = new poster_class(client);

//called every time a message gets sent in
function onMessageHandler(target, user, msg, self) {
	if (self) { return; }

	//split the message up into an array so we can see what's actually going on in it
	const inputMsg = msg.split(" ");

	//get the command name from the array as the first word in the message array
	const cmdName = inputMsg[0].toLowerCase();

	//for the list of commands, we need to make sure that we don't catch the bot's messages or it will cause problems
	if (user.username != 'Saint_Isidore_BOT') {
		//check to see if the command is one that can only be accessed by the streamer, their mods, or myself (pope_pontus)

		//mods/streamer wish to give a shoutout to a chat member/streamer
		if (cmdName == '!so' && inputMsg.length > 1 && helper.checkIfModOrStreamer(user, theStreamer)) {

			client.say(target, `Please check out and follow this cool dude here! https://www.twitch.tv/${inputMsg[1]}`);

			//a moderator or the streamer wishes to flush the bot's posting prompt
		} else if (cmdName == '!flush' && helper.checkIfModOrStreamer(user, theStreamer)) {

			resetPrompt();
			client.say(target, `@${user.username}: bot's prompt has been flushed successfully!`);

			//starts clip collection services
		} else if (cmdName == '!startcollect' && !collectClips && helper.checkIfModOrStreamer(user, theStreamer)) {

			collectClips = true;
			client.say(target, "Clip collection is turned on!");

			//ends clip collection services
		} else if (cmdName == '!endcollect' && collectClips && helper.checkIfModOrStreamer(user, theStreamer)) {

			ClipCollector.writeClipsToHTMLFile();
			collectClips = false;
			client.say(target, "All collected clips are written to file!");

			//activates GPT-3 for a post. Heavily controlled
		} else if (cmdName == '!post' && helper.checkIfModOrStreamer(user, theStreamer)) {

			generatePost(user, target);

			//for mods/streamer to add a custom command
		} else if (cmdName == '!addcommand' && helper.checkIfModOrStreamer(user, theStreamer)) {

			commands_holder.createAndWriteCommandsToFile(client, target, user, inputMsg);

			//for mods/streamer to remove a custom command
		} else if (cmdName == '!removecommand' && helper.checkIfModOrStreamer(user, theStreamer)) {

			commands_holder.removeCommand(client, target, user, inputMsg[2], (inputMsg[1] == true));

			//for mods/streamer to edit a custom command
		} else if (cmdName == '!editcommand' && helper.checkIfModOrStreamer(user, theStreamer)) {

			commands_holder.editCommand(client, target, user, inputMsg);

		} else if (cmdName == '!lurk') {//the user wishes to enter lurk mode

			client.say(target, lurk_list.addLurker(user, inputMsg));

		} else if (cmdName == '!unlurk') {//the user wishes to exit lurk mode

			client.say(target, lurk_list.removeLurker(user));

		} else if (cmdName == '!customlist') {//gets a list of all custom commands on the channel

			commands_holder.postListOfCreatedCommands(client, target, user);

		} else if (cmdName == '!followage') {//user wants to know how long they've followed the stream

			async_functions.getFollowAge(client_id, outside_token, user, target);

		} else if (cmdName == '!suggestion') {//a chatmember has a suggestion on what to add to the bot

			if (writeSuggestionToFile(inputMsg)) {
				client.say(target, `@${user.username}, your suggestion has been written down. Thank you!`);
			}

		} else if (cmdName == '!suggestionlist') {//the user wants to see all of the current suggestions for the bot

			async_functions.printAllSuggestions(user, target);

		} else if (cmdName == '!title') {//tells asking user what the current title of the stream is

			async_functions.getStreamTitle(client_id, outside_token, user, target);

		} else if (cmdName == '!game') {//tells user what category stream is under

			async_functions.getCategory(client_id, outside_token, user, target);

		} else if (cmdName == '!roulette' && isModerator) {//allows chat member to take a chance at being timed out

			dice.takeAChanceAtBeingBanned(user, target);

			//dumb little command for whenever my voice cracks, which is apparently often
		} else if (cmdName == '!voice') {

			commands_holder.getAndUpdateVoiceCracks(client, target);

		} else if (cmdName == '!wikirand') {//chat member wants to know about something random off wikipedia

			async_functions.getRandWikipediaArticle(user, target);

		} else if (cmdName.substring(0, 5) == '!roll') {//simple dice rolling command. Can do many sided dice, not just a d20 or d6

			dice.getDiceRoll(cmdName, user, target);

		} else if (cmdName == "!flip") {//flips a coin and returns the result to chat

			dice.flipCoin(user, target);

		} else if (cmdName == '!uptime') {//user wants to know how long the stream has been going for

			async_functions.getStreamUptime(client_id, outside_token, user, target);

		} else if (cmdName == '!calc') {//chat member wants to do basic math with the bot

			const msg = `@${user.username}: ` + ` ` + Calculator.calculate(helper.combineInput(inputMsg, false));
			client.say(target, msg);

		} else if (cmdName == "!time") {//gets the current time in Central Standard Time (CST)

			helper.getCurrentTime(client, target, user);

		} else if (cmdName == '!schedule') {//returns a link to the stream schedule

			async_functions.getChannelSchedule(client_id, outside_token, user, target);

		} else if (cmdName == '!who') {//returns the bio of the streamer

			async_functions.getChannelSummary(client_id, outside_token, user, target);

		} else if (cmdName == '!accountage') {//returns the age of the account asking

			async_functions.getUserAcctAge(client_id, outside_token, user, target);

		//these two commands benched until I can get Spotify API access unscuffed
		// } else if (cmdName == '!song') {//returns the song and artist playing through Spotify

		// 	async_functions.getCurrentSongTitleFromSpotify(client, target, user);

		// } else if (cmdName == '!skipsong') {//tallies requests to change song and changes it at a threshold of those

		// 	thresholdCalc(target, user);

		} else if (cmdName == '!dictrand') {//user wants to get a random word from the Merriam-Webster Dictionary

			async_functions.getRandomWordFromDictionary(user, target);

		} else if (cmdName == '!gitchanges') {//user wants to see how much changed from the last two commits
			
			async_functions.getGithubRepoInfo(target);
		
		} else if (cmdName == '!convert') {//user wants to convert an amount of one currency to another

			async_functions.getCurrencyExchangeRate(user, target, inputMsg[1], inputMsg[2], Number(inputMsg[3]));

		} else if (cmdName == '!pokerand') {//user wants a random pokemon's pokedex entry (just name, genus, and flavor text)

			async_functions.getRandomPokemon(target);

		} else if (cmdName == '!numrand') {//user wants a fact about a random number

			async_functions.getRandomNumberFact(target);

		} else if (cmdName == '!8ball') {//user wants a magic 8 ball fortune

			commands_holder.magic8Ball(client, user, target);

		//commented out until I can get the PATCH requests to go through
		//} else if (cmdName == '!changegame') {

			//if (helper.checkIfModOrStreamer(user, theStreamer)) {
			//	async_functions.editChannelCategory(client_id, outside_token, user, helper.combineInput(inputMsg, true));
		    //}

		} else {
			//check to see if the message is a custom command
			if (commands_holder.getCustomCommand(client, target, cmdName)) {

				console.log("Custom command executed");

			} else if (collectClips) {//if enabled, check to see if it's a clip

				//verify that the message has no URLs in it
				let possibleClipURL = helper.checkIfURL(inputMsg);

				//if it does, pass it into the collector for processing
				if (possibleClipURL != "") {
					ClipCollector.validateAndStoreClipLink(client_id, outside_token, possibleClipURL);
				}

			} else {
				//if it isn't, we send the message through the prompt and check for other fun things
				prompt += cmdName + helper.combineInput(inputMsg, true) + '\n';
				linesCount++;
				lurkerHasTypedMsg(target, user);
			}
			//check to see if the msg is spam
			// } else if (!helper.detectSymbolSpam(helper.combineInput(inputMsg, true), target, user) && !helper.detectUnicode(inputMsg, target, user)) {

			// 	//if it isn't, we send the message through the prompt and check for other fun things
			// 	prompt += cmdName + helper.combineInput(inputMsg, true) + '\n';
			// 	linesCount++;
			// 	lurkerHasTypedMsg(target, user);
			// 	writeMsgToFile();

			// }
		}
	}
}

//lets me know that the script has connected to twitch servers for their API
function onConnectedHandler(addy, prt) {
	console.log(`* Connected to ${addy}:${prt}`);
}

//sends out a message every so often, following through a list of possible messages/functions. 
async function intervalMessages() {
	commands_holder.getIntervalCommand(callThisFunctionNumber, client);

	callThisFunctionNumber = await commands_holder.getLengthOfIntervals(callThisFunctionNumber);

}

//hanldes the requests to skip songs from a user base and makes sure only one vote per user goes through
function thresholdCalc(target, user) {
	if (skipThreshold < 5) {
		if (!skip_list.includes(user.username)) {
			++skipThreshold;
			skip_list.push(user.username);
			client.say(target, `@${user.username}: Skip request recorded. ${skipThreshold}/5 requests put through`);
        }
	} else {
		async_functions.skipToNextSong(client, target, user);
		skipThreshold = 0;
		skip_list = [];
	}
}

//resets the prompt message and sets the line count down to zero
function resetPrompt() {
	console.log(linesCount);
	console.log(prompt);
}

//handles the AI posting. If a post was made, we reset the prompt and set linesCount back to 0
function generatePost(user, target) {
	//we will check the length of the prompt first. If the length is above 2000 characters, we will only
	//take the last 2000 characters for the prompt and discard all other characters.
	//An overly-large prompt will cause the API to return a 400 error
	if (prompt.length > 2000) { prompt = prompt.substr(prompt.length - 2000); }

	post.generatePost(user, prompt, linesCount, target);
	resetPrompt();

	if (prompt == "") { console.log("prompt flushed after response generation successfully!"); }
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
	for (let i = 1; i < inputMsg.length; ++i) {
		compiledMsg += inputMsg[i] + " ";
	}

	fs.appendFile('./data/suggestions.txt', compiledMsg + '\n', (err) => {
		if (err) { console.error(err); }
	});

	return true;
}