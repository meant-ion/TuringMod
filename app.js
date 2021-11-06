import dotenv from 'dotenv';
dotenv.config({ path: './.env'});

import { client as _client } from 'tmi.js';
import { appendFile } from 'fs';
import { Client, Intents } from 'discord.js';
import Calculator from './calculator.js';
import Helper from './helper.js';
import CommandArray from './sqlite_db.js';
import LurkList from './lurker_list.js';
import AsyncHolder from './asyncer.js';
import Dice from './dice.js';
import ClipCollector from './clipcollector.js';
import Post from './post.js';
import PubSubHandler from './pubsub_handler.js';


const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const token = process.env.DISCORD_CLIENT_TOKEN;

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

const the_streamer = opts.channels[0];

//we want at least 5 lines of text to be able to make Turing-Bot
//be able to emulate chat the best it can
let lines_count = 0;
let prompt = "";

//what we set when we want to collect clips to be seen later
let collect_clips = false;

//what we use to tell if quiet mode (i.e. no @-ing the streamer) is enabled
let quiet_mode_enabled = false;

//what we use to measure how many viewers/commenters wish to change the song currently playing (needs to be 5 and over)
//relevant command: !skipsong
let skip_threshold = 0;

//lets us know that bot is connected to the discord server we need it on
discord_client.once('ready', () => {
	console.log(`* Logged in as ${discord_client.user.tag} through Discord!`);
});

let client = new _client(opts);
client.connect();
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

//setting up the interval for giving people info about the streams every 15-20 mins
setInterval(intervalMessages, 600000);

//separate variable to tell the program which function gets called
let call_this_function_number = 0;

//array to hold who voted to skip a song, helps to prevent someone voting more than once per song
let skip_list = [];

//when a message is sent out, we will take it and push it out to the Twitch chat
discord_client.on('messageCreate', message => {
	//take the message and split it up into separate words
	const inputMsg = message.content.split(" ");
	let response = "";
	if (inputMsg[0] == '!send') {//the message generated was accepted by admin
		response = post.getResponse();

		//search through the list of responses and channels to find the correct one and then post that out
		if (response != "") {
			client.say(opts.channels[0], `MrDestructoid ${response}`);
		} else {
			client.say(opts.channels[0], `No response found for this channel`);
		}
	} else if (inputMsg[0] == '!reject') {
		client.say(opts.channels[0], `Response rejected by bot admin`);
	}
});

//generate the custom objects for the special commands and the !lurk/!unlurk features and other necessary classes
let commands_holder = new CommandArray();
let helper = new Helper();
let lurk_list = new LurkList();
let async_functions = new AsyncHolder(client, commands_holder);
let dice = new Dice(client);
let calculator = new Calculator();
let clip_collector = new ClipCollector(async_functions);
let post = new Post(discord_client, client);
let pubsubs = new PubSubHandler();

//called every time a message gets sent in
function onMessageHandler(target, user, msg, self) {
	if (self) { return; }

	//split the message up into an array so we can see what's actually going on in it
	const input_msg = msg.split(" ");

	//get the command name from the array as the first word in the message array
	const cmd_name = input_msg[0].toLowerCase();

	//for the list of commands, we need to make sure that we don't catch the bot's messages or it will cause problems
	if (user.username != 'Saint_Isidore_BOT') {
		//check to see if the command is one that can only be accessed by the streamer, their mods, or myself (pope_pontus)

		//mods/streamer wish to give a shoutout to a chat member/streamer
		if (cmd_name == '!so' && input_msg.length > 1 && helper.checkIfModOrStreamer(user, the_streamer)) {

			client.say(target, `Please check out and follow this cool dude here! https://www.twitch.tv/${input_msg[1]}`);

		} else if (cmd_name == '!makesub' && helper.checkIfModOrStreamer(user, the_streamer)) {

			makePubSubscription(input_msg[1]);

		//a moderator or the streamer wishes to flush the bot's posting prompt
		} else if (cmd_name == '!flush' && helper.checkIfModOrStreamer(user, the_streamer)) {

			if (prompt.length == 0) {//make sure we don't waste time flushing a prompt that is just empty
				client.say(target, "Cannot flush and erase an empty prompt");
			} else {
				resetPrompt();
				client.say(target, `@${user.username}: bot's prompt has been flushed successfully!`);
			}

			//starts clip collection services
		} else if (cmd_name == '!startcollect' && !collect_clips && helper.checkIfModOrStreamer(user, the_streamer)) {

			collect_clips = true;
			client.say(target, "Clip collection is turned on!");

			//ends clip collection services
		} else if (cmd_name == '!endcollect' && collect_clips && helper.checkIfModOrStreamer(user, the_streamer)) {

			async_functions.getClipList();
			clip_collector.writeClipsToHTMLFile();
			collect_clips = false;
			client.say(target, "All collected clips are written to file!");

			//activates GPT-3 for a post. Heavily controlled
		} else if (cmd_name == '!post' && helper.checkIfModOrStreamer(user, the_streamer)) {

			generatePost(target);

			//for mods/streamer to add a custom command
		} else if (cmd_name == '!addcommand' && helper.checkIfModOrStreamer(user, the_streamer)) {

			commands_holder.createAndWriteCommandsToFile(client, target, user, input_msg);

			//for mods/streamer to remove a custom command
		} else if (cmd_name == '!removecommand' && helper.checkIfModOrStreamer(user, the_streamer)) {

			commands_holder.removeCommand(client, target, user, input_msg[2], (input_msg[1] == true));

			//for mods/streamer to edit a custom command
		} else if (cmd_name == '!editcommand' && helper.checkIfModOrStreamer(user, the_streamer)) {

			commands_holder.editCommand(client, target, user, input_msg);

		} else if (cmd_name == '!changegame' && helper.checkIfModOrStreamer(user, the_streamer)) {//moderator/streamer wishes to change the category of the stream

			async_functions.editChannelCategory(user, helper.combineInput(input_msg, true), target);

		} else if (cmd_name == '!changetitle' && helper.checkIfModOrStreamer(user, the_streamer)) {//moderator/streamer wishes to change the title of the stream

			async_functions.editStreamTitle(helper.combineInput(input_msg, true), target);

		//} else if (cmdName == '!shotgun' && helper.checkIfModOrStreamer(user, theStreamer)) {//moderator/streamer wants to have the "banhammer" hit randomly

			//note to self, if there is ever more than 100 people watching, uncomment this for the stream lol
			//as if that will ever happen of course
			//async_functions.shotgunTheChat(client_id);

		} else if (cmd_name == '!testviewers' && helper.checkIfModOrStreamer(user, the_streamer)) {//mod/streamer wants to see chances channel is being viewbotted

			async_functions.getChancesStreamIsViewbotted(target);

		} else if (cmd_name == '!quiet' && helper.checkIfModOrStreamer(user, the_streamer)) {

			quiet_mode_enabled = !quiet_mode_enabled;
			let msg;
			if (quiet_mode_enabled) {
				msg = `@${user.username}: Quiet mode has been enabled. All messages @-ing the streamer will be removed unitl turned off`;
			} else {
				msg = `@${user.username}: Quiet mode has been disabled. Feel free to @ the streamer`;
			}
			client.say(target, msg);

		} else if (cmd_name == '!lurk') {//the user wishes to enter lurk mode

			client.say(target, lurk_list.addLurker(user, input_msg));

		} else if (cmd_name == '!unlurk') {//the user wishes to exit lurk mode

			client.say(target, lurk_list.removeLurker(user, false));

		} else if (cmd_name == '!leave') {//user is letting the stream know they're heading out for the stream

			client.say(target, lurk_list.removeLurker(user, true));

		} else if (cmd_name == '!customlist') {//gets a list of all custom commands on the channel

			commands_holder.postListOfCreatedCommands(client, target, user);

		} else if (cmd_name == '!followage') {//user wants to know how long they've followed the stream

			if (user.username == the_streamer) {//make sure the streamer isn't the one trying to get a follow age lol
				client.say(target, "You're literally the streamer, I can't get a follow time for yourself >:-(");
			} else {
				async_functions.getFollowAge(user, target);
			}

		} else if (cmd_name == '!sg') {//a chatmember has a suggestion on what to add to the bot

			if (writeSuggestionToFile(input_msg)) {
				client.say(target, `@${user.username}, your suggestion has been written down. Thank you!`);
			}

		} else if (cmd_name == '!title') {//tells asking user what the current title of the stream is

			async_functions.getStreamTitle(user, target);

		} else if (cmd_name == '!game') {//tells user what category stream is under

			async_functions.getCategory(user, target);

		} else if (cmd_name == '!roulette') {//allows chat member to take a chance at being timed out

			if (isStreamer(user.username, the_streamer)) {//make sure it isnt the streamer trying to play russian roulette
				this.client.say(target, "You are the streamer, I couldn't time you out if I wanted to");
			} else {
				dice.takeAChanceAtBeingBanned(user, target);
			}

		} else if (cmd_name == '!voice') {//dumb little command for whenever my voice cracks, which is apparently often

			commands_holder.getAndUpdateVoiceCracks(client, target);

		} else if (cmd_name == '!wikirand') {//chat member wants to know about something random off wikipedia

			async_functions.getRandWikipediaArticle(user, target);

		} else if (cmd_name.substring(0, 5) == '!roll') {//simple dice rolling command. Can do many sided dice, not just a d20 or d6

			dice.getDiceRoll(cmd_name, user, target);

		} else if (cmd_name == "!flip") {//flips a coin and returns the result to chat

			dice.flipCoin(user, target);

		} else if (cmd_name == '!uptime') {//user wants to know how long the stream has been going for

			async_functions.getStreamUptime(user, target);

		} else if (cmd_name == '!calc') {//chat member wants to do basic math with the bot

			const msg = `@${user.username}: ` + ` ` + calculator.calculate(helper.combineInput(input_msg, false));
			client.say(target, msg);

		} else if (cmd_name == "!time") {//gets the current time in Central Standard Time (CST)

			helper.getCurrentTime(client, target, user);

		} else if (cmd_name == '!schedule') {//returns a link to the stream schedule

			async_functions.getChannelSchedule(user, target);

		} else if (cmd_name == '!who') {//returns the bio of the streamer

			async_functions.getChannelSummary(user, target);

		} else if (cmd_name == '!accountage') {//returns the age of the account asking

			async_functions.getUserAcctAge(user, target);

		} else if (cmd_name == '!song') {//returns the song and artist playing through Spotify

		 	async_functions.getCurrentSongTitleFromSpotify(target, user);

		} else if (cmd_name == '!skipsong') {//tallies requests to change song and changes it at a threshold of those

		    thresholdCalc(target, user);

		} else if (cmd_name == '!addsong') {//user wants to add a song to the playlist queue

			async_functions.addSongToQueue(target, user, input_msg);

		} else if (cmd_name == '!suggestionlist') {//user wants to see what has been suggested but not yet implemented currently

			async_functions.getAllCurrentSuggestions(target);

		} else if (cmd_name == '!dictrand') {//user wants to get a random word from the Merriam-Webster Dictionary

			async_functions.getRandomWordFromDictionary(user, target);

		} else if (cmd_name == '!gitchanges') {//user wants to see how much changed from the last two commits
			
			async_functions.getGithubRepoInfo(target);
		
		} else if (cmd_name == '!convert') {//user wants to convert an amount of one currency to another

			async_functions.getCurrencyExchangeRate(user, target, input_msg[1], input_msg[2], Number(input_msg[3]));

		} else if (cmd_name == '!pokerand') {//user wants a random pokemon's pokedex entry (just name, genus, and flavor text)

			async_functions.getRandomPokemon(target);

		} else if (cmd_name == '!numrand') {//user wants a fact about a random number

			async_functions.getRandomNumberFact(target);

		} else if (cmd_name == '!8ball') {//user wants a magic 8 ball fortune

			commands_holder.magic8Ball(client, user, target);

		} else if (cmd_name == '!spacepic') {//user wants to see the NASA Space Pic of the Day

			async_functions.getNASAPicOfTheDay(target);

		} else if (cmd_name == '!randlang') {//user wants to look at a random esolang

			async_functions.getRandEsoLang(user, target);

		} else {
			//check to see if the message is a custom command
			if (commands_holder.getCustomCommand(client, target, cmd_name)) {

				console.log("Custom command executed");

			} else if (collect_clips) {//if enabled, check to see if it's a clip

				//verify that the message has no URLs in it
				let possibleClipURL = helper.checkIfURL(input_msg);

				//if it does, pass it into the collector for processing
				if (possibleClipURL != "") {
					clip_collector.validateAndStoreClipLink(async_functions, possibleClipURL);
				}

			//detect if this message is either non-english (unicode) or symbol spam
			} else if (!helper.detectUnicode(input_msg, target, user, client)) {
				//check if quiet mode has been enabled and if the user has mentioned the streamer if so
				//if both are true, remove the msg via a 1-second timeout
				if (quiet_mode_enabled && helper.isStreamerMentioned(input_msg) && 
					!isStreamer(user.username, the_streamer)) {
					client.timeout(target, user.username, 1, "Quiet Mode Enabled, please do not @ the streamer");
				} else {//if it isn't, we send the message through the prompt and check for other fun things
					prompt += cmd_name + helper.combineInput(input_msg, true) + '\n';
					lines_count++;
					lurkerHasTypedMsg(target, user);
				}

			}
		}
	}
}

//lets me know that the script has connected to twitch servers for their API
function onConnectedHandler(addy, prt) {
	console.log(`* Connected to ${addy}:${prt}`);
}

//sends out a message every so often, following through a list of possible messages/functions. 
async function intervalMessages() {
	commands_holder.getIntervalCommand(call_this_function_number, client);
	call_this_function_number = await commands_holder.getLengthOfIntervals(call_this_function_number);
}

async function makePubSubscription(topic) {
	const tkn = await commands_holder.getTwitchInfo(0);
	pubsubs.requestToListen(topic, tkn);
}

//hanldes the requests to skip songs from a user base and makes sure only one vote per user goes through
function thresholdCalc(target, user) {
	if (skip_threshold < 5) {
		if (!skip_list.includes(user.username)) {
			++skip_threshold;
			skip_list.push(user.username);
			client.say(target, `@${user.username}: Skip request recorded. ${skip_threshold}/5 requests put through`);
        }
	} else {
		async_functions.skipToNextSong(target, user);
		skip_threshold = 0;
		skip_list = [];
	}
}

//resets the prompt message and sets the line count down to zero
function resetPrompt() {
	lines_count = 0;
	prompt = "";
}

function isStreamer(username, the_streamer) { return username == the_streamer; }

//handles the AI posting. If a post was made, we reset the prompt and set linesCount back to 0
async function generatePost(target) {
	//we will check the length of the prompt first. If the length is above 2000 characters, we will only
	//take the last 2000 characters for the prompt and discard all other characters.
	//An overly-large prompt will cause the API to return a 400 error
	if (prompt.length > 2000) { prompt = prompt.substr(prompt.length - 2000); }

	try {
		const key = await commands_holder.getAPIKeys(0);
		post.generatePost(prompt, lines_count, target, key);
		resetPrompt();
	
		if (prompt == "") { console.log("prompt flushed after response generation successfully!"); }
	} catch (err) { console.error(err); }

}

//if the user types again as a lurker, we display that they unlurked from chat
function lurkerHasTypedMsg(target, user) {
	let lurk_msg = lurk_list.removeLurker(user, false);
	if (lurk_msg != `You needed to be lurking already in order to stop lurking @${user.username}`) {
		client.say(target, lurk_msg);
    }
}

//appends a suggestion from a viewer to a suggestions file for later consideration
function writeSuggestionToFile(inputMsg) {

	//compile the message into a single string for better insertion into file
	let compiled_msg = helper.combineInput(inputMsg, true);

	appendFile('./data/suggestions.txt', compiled_msg + '\n', (err) => {
		if (err) { console.error(err); }
	});

	return true;
}

//this goes last to prevent any issues on discord's end
discord_client.login(token);