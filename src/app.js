import dotenv from 'dotenv';
dotenv.config({ path: './.env'});

import { client as _client } from 'tmi.js';
import { appendFile } from 'fs';
import { Client, Intents } from 'discord.js';
import Calculator from './calculator.js';
import Helper from './helper.js';
import CommandArray from './sqlite_db.js';
import LurkList from './lurker_list.js';
import TwitchAPI from './twitch_api.js';
import SpotifyAPI from './spotify_api.js';
import MiscAPI from './misc_api.js';
import Dice from './dice.js';
import ClipCollector from './clipcollector.js';
import Post from './post.js';
import PubSubHandler from './pubsub_handler.js';

const discord_client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

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

let client = new _client(opts);

//generate the custom objects for the special commands and the !lurk/!unlurk features and other necessary classes
let commands_holder = new CommandArray();
let helper = new Helper();
let lurk_list = new LurkList();
let twitch_api = new TwitchAPI(client, commands_holder);
let spotify_api = new SpotifyAPI(client, commands_holder);
let misc_api = new MiscAPI(client, commands_holder);
let dice = new Dice(client);
let calculator = new Calculator();
let clip_collector = new ClipCollector(twitch_api);
let post = new Post(discord_client, client);
let pubsubs = new PubSubHandler(client, twitch_api);

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

//separate variable to tell the program which function gets called
let call_this_function_number = 0;

//array to hold who voted to skip a song, helps to prevent someone voting more than once per song
let skip_list = [];

function execTheBot() {
	const token = process.env.DISCORD_CLIENT_TOKEN;

	//lets us know that bot is connected to the discord server we need it on
	discord_client.once('ready', () => console.log(`* Logged in as ${discord_client.user.tag} through Discord!`));
	client.connect();
	client.on('message', onMessageHandler);
	client.on('connected', (addy, prt) => console.log(`* Connected to ${addy}:${prt}`));

	//setting up the interval for giving people info about the streams every 15-20 mins
	setInterval(intervalMessages, 600000);

	//when a message is sent out, we will take it and push it out to the Twitch chat
	discord_client.on('messageCreate', message => {
		//take the message and split it up into separate words
		const input_msg = message.content.split(" ");
		if (input_msg[0] == '!send') {//the message generated was accepted by admin
			let response = post.getResponse();

			//search through the list of responses and channels to find the correct one and then post that out
			client.say(opts.channels[0], `${response != "" ? `MrDestructoid ${response}` : `No response found for this channel`}`);

		} else if (input_msg[0] == '!reject') client.say(opts.channels[0], `Response rejected by bot admin`);
	});

	//set the timer for the ad warning function so we can get the twitch_api object fully initialized
	setTimeout(adsIntervalHandler, 15000);

	//set timer to make the pubsub subscription so I dont have to type a command for it
	setTimeout(makeSub, 15000);

	//this goes last to prevent any issues on discord's end
	discord_client.login(token);
}

//called every time a message gets sent in
function onMessageHandler(target, user, msg, self) {
	if (self) { return; }

	//split the message up into an array so we can see what's actually going on in it
	const input_msg = msg.split(" ");

	//get the command name from the array as the first word in the message array
	const cmd_name = input_msg[0].toLowerCase();

	//for the list of commands, we need to make sure that we don't catch the bot's messages or it will cause problems
	if (user.username != 'Saint_Isidore_BOT') {

			//mods/streamer wish to give a shoutout to a chat member/streamer
		if (cmd_name == '!so' && input_msg.length > 1 && helper.checkIfModOrStreamer(user, the_streamer)) {

			client.say(target, `Please check out and follow this cool dude here! https://www.twitch.tv/${input_msg[1]}`);

		  //mod/streamer wants to have the bot listen in on a PubSub topic
		} else if (cmd_name == '!makesub' && helper.checkIfModOrStreamer(user, the_streamer)) {

			twitch_api.makePubSubscription(input_msg[1], pubsubs);

		  //a moderator or the streamer wishes to flush the bot's posting prompt
		} else if (cmd_name == '!flush' && helper.checkIfModOrStreamer(user, the_streamer)) {

			//make sure we don't waste time flushing a prompt that is just empty
			if (prompt.length == 0) 
				client.say(target, "Cannot flush and erase an empty prompt");
			else {
				resetPrompt();
				client.say(target, `@${user.username}: bot's prompt has been flushed successfully!`);
			}

			//starts clip collection services
		} else if (cmd_name == '!startcollect' && !collect_clips && helper.checkIfModOrStreamer(user, the_streamer)) {

			collect_clips = true;
			client.say(target, "Clip collection is turned on!");

			//ends clip collection services
		} else if (cmd_name == '!endcollect' && collect_clips && helper.checkIfModOrStreamer(user, the_streamer)) {

			getClipsInOrder(target);

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

		  //moderator/streamer wishes to change the category of the stream
		} else if (cmd_name == '!changegame' && helper.checkIfModOrStreamer(user, the_streamer)) {

			twitch_api.editChannelCategory(user, helper.combineInput(input_msg, true), target);

		  //moderator/streamer wishes to change the title of the stream
		} else if (cmd_name == '!changetitle' && helper.checkIfModOrStreamer(user, the_streamer)) {

			twitch_api.editStreamTitle(helper.combineInput(input_msg, true), target);

		  //moderator/streamer wants to have the "banhammer" hit randomly
		//} else if (cmdName == '!shotgun' && helper.checkIfModOrStreamer(user, theStreamer)) {

			//note to self, if there is ever more than 100 people watching, uncomment this for the stream lol
			//as if that will ever happen of course
			//twitch_api.shotgunTheChat(client_id);

		  //mod/streamer wants to see chances channel is being viewbotted
		} else if (cmd_name == '!testviewers' && helper.checkIfModOrStreamer(user, the_streamer)) {

			twitch_api.getChancesStreamIsViewbotted(target);

		} else if (cmd_name == '!quiet' && helper.checkIfModOrStreamer(user, the_streamer)) {//mod/streamer toggles quiet mode

			quiet_mode_enabled = !quiet_mode_enabled;
			let msg = quiet_mode_enabled ? `@${user.username}: Quiet mode has been enabled. All messages @-ing the streamer will be removed unitl turned off` 
						: `@${user.username}: Quiet mode has been disabled. Feel free to @ the streamer` ;
			client.say(target, msg);

		  //mod/streamer wants to shut bot down safely
		} else if (cmd_name == '!shutdown' && helper.checkIfModOrStreamer(user, the_streamer)) {
			
			shutDownBot(target);

		} else if (cmd_name == '!died' && helper.checkIfModOrStreamer(user, the_streamer)) {

			commands_holder.getAndUpdateDeathCount(client, target);

		} else if (cmd_name == '!rdeaths' && helper.checkIfModOrStreamer(user, the_streamer)) {

			commands_holder.setDeathsToZero(client, target);

		} else if (cmd_name == '!lurk') {//the user wishes to enter lurk mode

			client.say(target, lurk_list.addLurker(user, input_msg));

		} else if (cmd_name == '!unlurk') {//the user wishes to exit lurk mode

			client.say(target, lurk_list.removeLurker(user, false));

		} else if (cmd_name == '!leave') {//user is letting the stream know they're heading out for the stream

			client.say(target, lurk_list.removeLurker(user, true));

		} else if (cmd_name == '!customlist') {//gets a list of all custom commands on the channel

			commands_holder.postListOfCreatedCommands(client, target, user);

		} else if (cmd_name == '!followage') {//user wants to know how long they've followed the stream

			if (user.username == the_streamer) //make sure the streamer isn't the one trying to get a follow age lol
				client.say(target, "You're literally the streamer, I can't get a follow time for yourself >:-(");
			else 
				twitch_api.getFollowAge(user, target);

		} else if (cmd_name == '!sg') {//a chatmember has a suggestion on what to add to the bot

			client.say(target, 
				`${writeSuggestionToFile(input_msg) ? `@${user.username}, your suggestion has been written down. Thank you!` :`@${user.username}, empty suggestion not written to file`}`);

		} else if (cmd_name == '!title') {//tells asking user what the current title of the stream is

			twitch_api.getStreamTitle(user, target);

		} else if (cmd_name == '!game') {//tells user what category stream is under

			twitch_api.getCategory(user, target);

		} else if (cmd_name == '!roulette') {//allows chat member to take a chance at being timed out

			if (helper.isStreamer(user.username, the_streamer)) //make sure it isnt the streamer trying to play russian roulette
				this.client.say(target, "You are the streamer, I couldn't time you out if I wanted to");
			else 
				dice.takeAChanceAtBeingBanned(user, target);

		} else if (cmd_name == '!voice') {//dumb little command for whenever my voice cracks, which is apparently often

			commands_holder.getAndUpdateVoiceCracks(client, target);

		} else if (cmd_name == '!wikirand') {//chat member wants to know about something random off wikipedia

			misc_api.getRandWikipediaArticle(user, target);

		  //simple dice rolling command. Can do many sided dice, not just a d20 or d6
		} else if (cmd_name == '!roll') {

			dice.getDiceRoll(input_msg[1], user, target);

		} else if (cmd_name == "!flip") {//flips a coin and returns the result to chat

			dice.flipCoin(user, target);

		} else if (cmd_name == '!uptime') {//user wants to know how long the stream has been going for

			twitch_api.getStreamUptime(user, target);

		} else if (cmd_name == '!calc') {//chat member wants to do basic math with the bot

			client.say(target, `@${user.username}: ` + ` ` + calculator.calculate(helper.combineInput(input_msg, false)));

		} else if (cmd_name == "!time") {//gets the current time in Central Standard Time (CST)

			helper.getCurrentTime(client, target, user);

		} else if (cmd_name == '!schedule') {//returns a link to the stream schedule

			twitch_api.getChannelSchedule(user, target);

		} else if (cmd_name == '!who') {//returns the bio of the streamer

			twitch_api.getChannelSummary(user, target);

		} else if (cmd_name == '!accountage') {//returns the age of the account asking

			twitch_api.getUserAcctAge(user, target);

		} else if (cmd_name == '!song') {//returns the song and artist playing through Spotify

		 	spotify_api.getCurrentSongTitleFromSpotify(target, user);

		} else if (cmd_name == '!skipsong') {//tallies requests to change song and changes it at a threshold of those

		    thresholdCalc(target, user);

		} else if (cmd_name == '!addsong') {//user wants to add a song to the playlist queue

			spotify_api.addSongToQueue(target, user, input_msg);

		} else if (cmd_name == '!suggestionlist') {//user wants to see what has been suggested but not yet implemented currently

			misc_api.getAllCurrentSuggestions(target);

		} else if (cmd_name == '!dictrand') {//user wants to get a random word from the Merriam-Webster Dictionary

			misc_api.getRandomWordFromDictionary(user, target);

		} else if (cmd_name == '!gitchanges') {//user wants to see how much changed from the last two commits
			
			misc_api.getGithubRepoInfo(target);
		
		} else if (cmd_name == '!convertcash') {//user wants to convert an amount of one currency to another

			misc_api.getCurrencyExchangeRate(user, target, input_msg[1], input_msg[2], Number(input_msg[3]));

		} else if (cmd_name == '!pokerand') {//user wants a random pokemon's pokedex entry (just name, genus, and flavor text)

			misc_api.getRandomPokemon(target);

		} else if (cmd_name == '!numrand') {//user wants a fact about a random number

			misc_api.getRandomNumberFact(target);

		} else if (cmd_name == '!8ball') {//user wants a magic 8 ball fortune

			commands_holder.magic8Ball(client, user, target);

		} else if (cmd_name == '!spacepic') {//user wants to see the NASA Space Pic of the Day

			misc_api.getNASAPicOfTheDay(target);

		} else if (cmd_name == '!randlang') {//user wants to look at a random esolang

			misc_api.getRandEsoLang(user, target);

		} else if (cmd_name == '!freegame') {//user wants a list of currently free games on the Epic Store

			misc_api.getFreeGamesOnEpicStore(target);

		} else {
			//check to see if the message is a custom command
			if (commands_holder.getCustomCommand(client, target, cmd_name)) console.log("Custom command executed");

			else if (collect_clips) {//if enabled, check to see if it's a clip

				//verify that the message has no URLs in it
				const possibleClipURL = helper.checkIfURL(input_msg);

				//if it does, pass it into the collector for processing
				if (possibleClipURL != "") clip_collector.validateAndStoreClipLink(twitch_api, possibleClipURL);

			  //detect if this message is either non-english (unicode) or symbol spam
			} //else if (!helper.detectUnicode(input_msg, target, user, client)) {
				//check if quiet mode has been enabled and if the user has mentioned the streamer if so
				//if both are true, remove the msg via a 1-second timeout
				if (quiet_mode_enabled && helper.isStreamerMentioned(input_msg) && 
					!helper.isStreamer(user.username, the_streamer)) {
					client.timeout(target, user.username, 1, "Quiet Mode Enabled, please do not @ the streamer");
				} else {//if it isn't, we send the message through the prompt and check for other fun things
					prompt += cmd_name + helper.combineInput(input_msg, true) + '\n';
					lines_count++;
					lurkerHasTypedMsg(target, user);
				}
			//}
		}
	}
}

//sends out a message every so often, following through a list of possible messages/functions. 
async function intervalMessages() {
	commands_holder.getIntervalCommand(call_this_function_number, client);
	call_this_function_number = await commands_holder.getLengthOfIntervals(call_this_function_number);
}

//hanldes the requests to skip songs from a user base and makes sure only one vote per user goes through
//@param   target   The chatroom that the message will be sent into
//@param   user     The chat member that typed in the command
function thresholdCalc(target, user) {
	if (skip_threshold < 5) {
		if (!skip_list.includes(user.username)) {
			++skip_threshold;
			skip_list.push(user.username);
			client.say(target, `@${user.username}: Skip request recorded. ${skip_threshold}/5 requests put through`);
        }
	} else {
		spotify_api.skipToNextSong(target, user);
		skip_threshold = 0;
		skip_list = [];
	}
}

//resets the prompt message and sets the line count down to zero
function resetPrompt() {
	lines_count = 0;
	prompt = "";
}

//handles the AI posting. If a post was made, we reset the prompt and set linesCount back to 0
//@param   target   The chatroom that the message will be sent into
async function generatePost(target) {
	//we will check the length of the prompt first. If the length is above 2000 characters, we will only
	//take the last 2000 characters for the prompt and discard all other characters.
	//An overly-large prompt will cause the API to return a 400 error
	if (prompt.length > 2000) prompt = prompt.substr(prompt.length - 2000);

	try {
		const key = await commands_holder.getAPIKeys(0);
		post.generatePost(prompt, lines_count, target, key);
		resetPrompt();
	
		if (prompt == "") console.log("prompt flushed after response generation successfully!");
	} catch (err) { console.error(err); }

}

//if the user types again as a lurker, we display that they unlurked from chat
//@param   target   The chatroom that the message will be sent into
//@param   user     The chat member that typed in the command
function lurkerHasTypedMsg(target, user) {
	let lurk_msg = lurk_list.removeLurker(user, false);
	if (lurk_msg != `You needed to be lurking already in order to stop lurking @${user.username}`) client.say(target, lurk_msg);
}

//appends a suggestion from a viewer to a suggestions file for later consideration
//@param   input_msg   The whole message gathered by the bot 
function writeSuggestionToFile(input_msg) {

	if (input_msg.length == 1 && input_msg[0] == '!sg') return false;

	appendFile('./data/suggestions.txt', helper.combineInput(input_msg, true) + '\n', (err) => {
		if (err) { console.error(err); }
	});

	return true;
}

//safely shuts down the bot when the shutdown command goes through
//@param   target   The chat room we are getting clips from 
async function shutDownBot(target) {

	//if we have the clip collection turned on, write everything to file and shut down
	if (collect_clips) getClipsInOrder(target);
	//now, shut off the PubSub WebSocket and stop all subscriptions through it
	const auth_key = await commands_holder.getTwitchInfo(0);
	pubsubs.killAllSubs(auth_key);
	client.say(target, "Shutting Down");
	//now, we just kill execution of the program
	process.exit(0);

}

//for setting up the pubsub for the channel points redemptions; twitch_api function returns a promise, so 
//setTimeout freaks out over it. Have to do it this way for it to function properly
function makeSub() {twitch_api.makePubSubscription('channel-points-channel-v1.71631229', pubsubs)}

//writes all collected Twitch clips onto an HTML file and stops collecting them
//@param   target   The chat room we are getting clips from 
function getClipsInOrder(target) {
	twitch_api.getClipList();
	clip_collector.writeClipsToHTMLFile();
	collect_clips = false;
	client.say(target, "All collected clips are written to file!");
}

//handles automatically posting that ads will be coming soon
async function adsIntervalHandler() {
	const curr_time = await twitch_api.getUneditedStreamUptime();
	const mins = Math.round(curr_time / 60);
	let intervalTime = 0;
	//the mid-roll ads start 30 mins after stream start (at least for me)
	//so we start the interval command after 30 mins
	if (mins == 30) {//the function is called 30 mins after stream start (tolerance for seconds between 30 and 31 mins)

		client.say('#pope_pontus', 'Mid-roll ads have started for the stream! All non-subscriptions will get midrolls in 1 hour');
		intervalTime = 360000;//call this function again in 1 hour

	} else if (mins > 30) {//we called it after the 30 min mark is passed
		const time_since_midrolls_started = mins - 30;
		let remainder_to_hour = time_since_midrolls_started > 60 ? 60 - (time_since_midrolls_started % 60) : 
				60 - time_since_midrolls_started;

		if (remainder_to_hour == 0) {//we called it exactly within an hour mark
			const msg = "Midrolls are starting now! I will be running 90 seconds of ads to keep prerolls off for as long as possible." + 
				"Please feel free to get up and stretch in the meantime, I'll be taking a break myself :)";
			client.say('#pope_pontus', msg);
			intervalTime = 360000;
		} else {//not within the hour mark probably b/c had to restart the bot or some other issue happened
			client.say('#pope_pontus', `Midrolls will play in ${remainder_to_hour} minutes. You have been warned`);
			intervalTime = remainder_to_hour * 60000;//call this function again in the time to the next hour
		}

	} else {

		const _mins = 30 - mins;
		client.say('#pope_pontus', `Midrolls will be starting within ${_mins} minutes. You have been warned`);
		//we set a timer callback to this function so we can check again 
		intervalTime = _mins * 60000;//needs to be in milliseconds, so quick conversions for both

	}

	//actually set up the callback to this function so the warning goes through
	if (intervalTime <= 0) console.log("Interval time not positive, error occurred");
	else setTimeout(adsIntervalHandler, intervalTime);
	
}

export {execTheBot};