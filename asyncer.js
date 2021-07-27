// file that holds all async functions that the bot will be using
//i.e. !followage, !post, etc...

const fetch = require('node-fetch');
const axios = require('axios');
const helper = require('./helper.js');
const fs = require('fs');

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
	async getFollowAge(client_id, outside_token, user) {
		const data = {
			'method': 'GET',
			'headers': {
				'client-id': `${client_id}`,
				'Authorization': `Bearer ${outside_token}`
			}
		};

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

	//soon to be fully implemented function that will shitpost and prove that a robot can emulate twitch chat easy
	//due to my own incompetence and lack of reading comprehension, this function no longer has an API key
	//for most likely an indefinite period, this will no longer work. The code will still work with a valid key, but
	//I no longer possess one. Apologies for the inconvenience
	//async generateShitpost(user) {
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

}

module.exports = AsyncHolder;
