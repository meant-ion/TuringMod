// file that holds all async functions that the bot will be using
//i.e. !followage, !post, etc...
require('dotenv').config({ path: './.env' });

const fetch = require('node-fetch');
const axios = require('axios');
const helper = require('./helper.js');
const fs = require('fs');
const got = require('got');
const readline = require('readline');
let { PythonShell } = require('python-shell');

class AsyncHolder {

	constructor(c, t) {
		this.client = c;
        this.target = t;
    }

    //gets a random wikipedia article from the wikimedia API and delivers it to chat
	async getRandWikipediaArticle(user) {

		const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=random&format=json&rnnamespace=0&rnlimit=1';

		try {
			const response = await axios.get(wikiUrl);
			const pageTitle = response.data.query.random[0].title.replace(/ /g, "_");
			const wikiPageURL = "https://en.wikipedia.org/wiki/" + pageTitle;
			this.client.say(this.target, `@${user.username}: Here's a link to a random wikipedia page. Have Fun! ${wikiPageURL}`);
		} catch (err) {
			console.error(err);
		}
	}

	//returns the length of time the asking user has been following the channel. Currently needs to be said in chat rather than in
	//a whisper, need to have the bot verified for that and need to make sure that all necessary parameters are met for it also
	async getFollowAge(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		var follower_list = undefined;

		await fetch('https://api.twitch.tv/helix/users/follows?to_id=71631229', data).then(result => result.json())
			.then(body => {
				follower_list = body;
				for (var i = 0; i < follower_list.data.length; ++i) {
					if (follower_list.data[i].from_login == user.username) {
						var followedDate = new Date(follower_list.data[i].followed_at);
						this.client.say(this.target, `@${user.username} has been following for: ${helper.getTimePassed(followedDate, true)}`);
					}
				}

		});
	}

	//returns a list of all suggestions sent into the bot as a message in chat
	async printAllSuggestions(user) {
		var msg = "";
		fs.readFile('./data/suggestions.txt', function (err, data) {
			if (err) { console.error(err); }

			var suggs = data.toString();
			var sugg = suggs.split('\n');
			for (var i = 0; i < sugg.length; ++i) {
				msg += sugg[i] + ', ';
			}
		});
		this.client.say(this.target, `@${user.username}: ${msg}`);
	}

	//generates an insult and tells it to the streamer, because my self-esteem is not low enough already
	async insultTheStreamer() {
		PythonShell.run('main.py', null, function (err) {
			if (err) {
				console.error(err);
			}
			console.log("TTS script executed");
		});
		
	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	async getChannelSchedule(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		var schedule = undefined;

		await fetch('https://api.twitch.tv/helix/schedule?broadcaster_id=71631229&utc_offset=-300&first=6', data).then(result => result.json())
			.then(body => {

				schedule = body;
				let streamDates = "";
				for (var i = 1; i < schedule.data.segments.length; ++i) {
					let curDate = new Date(schedule.data.segments[i].start_time);
					if (i + 1 == schedule.data.segments.length) {
						streamDates += curDate.toDateString();
					} else {
						streamDates += curDate.toDateString() + ", ";
                    }
					
				}
				this.client.say(this.target, `@${user.username}: Streams for the next week starting today are on ${streamDates}`);
		});
	}

	//gets and returns the channel owner's summary/bio
	async getChannelSummary(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/users?id=71631229', data).then(result => result.json()).then(body => {
			let description = body.data[0].description;
			this.client.say(this.target, `@${user.username}: ${description}`);
		});
	}

	//gets and returns the total time the stream has been live
	async getStreamUptime(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			let startTime = new Date(body.data[0].started_at);
			let timeMsg = helper.getTimePassed(startTime, false);
			this.client.say(this.target, `@${user.username}: ${timeMsg}`);
        })
	}

	//gets and returns the title of the stream
	async getStreamTitle(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			let streamTitle = body.data[0].title;
			this.client.say(this.target, `@${user.username} Title is: ${streamTitle}`);
		});
	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	async getUserAcctAge(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = `https://api.twitch.tv/helix/users?login=${user.username}`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let acctCreateDate = new Date(body.data[0].created_at);
			let timePassed = helper.getTimePassed(acctCreateDate, true);
			this.client.say(this.target, `@${user.username}, your account is ${timePassed} old`);
		});
	}

	//gets and returns the stream's category (what we are playing/doing for stream)
	async getCategory(client_id, access_token, user) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let streamCategory = vody.data[0].game_name;
			let msg = `@${user.username}: Current category is ${streamCategory}`;
			this.client.say(this.target, msg);
		});
    }

	//edits the channel category/game to one specified by a moderator
	//currently benched until I can wrap my mind around getting the correct token for editing a stream from a bot
	async editChannelCategory(client_id, access_token, user, gameName) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		gameName = gameName.slice(1);
		gameName = gameName.replace(/&/g, "%26");

		//first, we need to get the category id to change the channel's category
		const gameIdURL = `https://api.twitch.tv/helix/games?name=` + `${gameName}`;

		var responseStatus;

		var gameID = "";
		var editChannelURL = "";

		await fetch(gameIdURL, data).then(result => result.json()).then(body => {
			gameID = body.data[0].id;
			editChannelURL = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		});

		//now that we have the game id, we can make the patch request and go from there
		var res;

		//secondary data structure is meant for the editing, since we have to use PATCH and not GET
		const editData = {
			'method': 'PATCH',
			'headers': {
				'Authorization': `Bearer ${access_token}`,
				'Client-Id': `${client_id}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify({
				"game_id": gameID,
            }),
		};

		console.log(gameID);
		console.log(editData);

		await fetch(editChannelURL, editData).then((result) => {
			responseStatus = result.status;
			res = result;
			return result.json();
		}).then(body => {
			if (responseStatus == "204") {
				console.log("successfully updated category");
			}
			console.log(res);
			console.log(responseStatus);
		});

		
    }

	//soon to be fully implemented function that will shitpost and prove that a robot can emulate twitch chat easy
	//due to my own incompetence and lack of reading comprehension, this function no longer has an API key
	//for most likely an indefinite period, this will no longer work. The code will still work with a valid key, but
	//I no longer possess one. Apologies for the inconvenience
	async generatePost(user, prompt, linesCount) {
		//check first if minimum posting requirements have been met (enough comments made to post)
		if (linesCount >= 150) {
			//the url for GPT-3 for the model level; we will use the the content filter to keep compliance with OpenAI's TOS
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
					"top_p": 1,
					"frequency_penalty": 0.3,
					"presence_penalty": 0.3,
					"stop": ['.', '!', '?'],
					"logprobs": 10
				};

				//the headers, which is effectively the APi key for GPT-3 to be sent for model access
				const headers = {
					'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
				};

				var output_text = await got.post(url, { json: params, headers: headers }).json().choices[0].text;

				//using the readline library in order to control if the message can be posted or not via the console
				var rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout
				});

				//ask the question in the console to let the streamer see whats gonna be pushed before it goes out
				rl.question(`Text is ${output_text}, do you wish to publish this? `, function (answer) {

					if (answer.toLowerCase() == "yes" || answer.toLowerCase() == "y") {
						this.client.say(this.target, `@${user.username}: MrDestructoid ${output_text}`);
					} else {
						console.log("Post will be discarded then. Thank you!");
					}
					rl.close();
				});

				return true;
			} catch (err) {//in case of a screwup, post an error message to chat and print error
				this.client.say(this.target, `Error in text generation`);
				console.error(err);
				return false;
			}
		}
		return false;	
	}

	#createTwitchDataHeader(client_id, access_token) {
		return {
			'method': 'GET',
			'headers': {
				'client-id': `${client_id}`,
				'Authorization': `Bearer ${access_token}`
			}
		};
    }

}

module.exports = AsyncHolder;
