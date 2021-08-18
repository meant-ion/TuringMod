// file that holds all async functions that the bot will be using
//i.e. !followage, !post, etc...
require('dotenv').config({ path: './.env' });

const fetch = require('node-fetch');
const axios = require('axios');
const h = require('./helper.js');
const fs = require('fs');
const SpotifyWebApi = require('spotify-web-api-node');

class AsyncHolder {

	#clip_list;

	constructor(c, c_i, c_s, s, r_u, s_s) {
		this.client = c;
		this.helper = new h();
		this.#clip_list = [];
		this.spotifyApi = this.#initSpotifyStuff();
		//this.#getTwitchToken(c_i, c_s, s, r_u, s_s);
    }

//--------------------------------------TWITCH API FUNCTIONS-------------------------------------------------------------

	//returns the length of time the asking user has been following the channel. Currently needs to be said in chat rather than in
	//a whisper, need to have the bot verified for that and need to make sure that all necessary parameters are met for it also
	async getFollowAge(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		var follower_list = undefined;

		await fetch('https://api.twitch.tv/helix/users/follows?to_id=71631229', data).then(result => result.json())
			.then(body => {
				follower_list = body;
				for (var i = 0; i < follower_list.data.length; ++i) {
					if (follower_list.data[i].from_login == user.username) {
						var followedDate = new Date(follower_list.data[i].followed_at);
						this.client.say(target, `@${user.username} has been following for:` 
							+ `${this.helper.getTimePassed(followedDate, true)}`);
					}
				}

		});
	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	async getChannelSchedule(client_id, access_token, user, target) {
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
				this.client.say(target, `@${user.username}: Streams for the next week starting today are on ${streamDates}`);
		});
	}

	//gets and returns the channel owner's summary/bio
	async getChannelSummary(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/users?id=71631229', data).then(result => result.json()).then(body => {
			let description = body.data[0].description;
			this.client.say(target, `@${user.username}: ${description}`);
		});
	}

	//gets and returns the total time the stream has been live. If channel isn't live, returns a message saying so
	async getStreamUptime(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			//check to see if the stream is live; if we don't, the app crashes hard and needs to be restarted
			if (body.data[0].started_at == undefined) {
				this.client.say(this.target, `@${user.username}: Stream is currently offline. Use !schedule to find out when` +
					` the next stream is. Thank you! :)`);
			} else {
				let startTime = new Date(body.data[0].started_at);
				let timeMsg = this.helper.getTimePassed(startTime, false);
				this.client.say(target, `@${user.username}: ${timeMsg}`);
            }
			
        })
	}

	//gets and returns the title of the stream
	async getStreamTitle(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			let streamTitle = body.data[0].title;
			this.client.say(target, `@${user.username} Title is: ${streamTitle}`);
		});
	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	async getUserAcctAge(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = `https://api.twitch.tv/helix/users?login=${user.username}`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let acctCreateDate = new Date(body.data[0].created_at);
			let timePassed = this.helper.getTimePassed(acctCreateDate, true);
			this.client.say(target, `@${user.username}, your account is ${timePassed} old`);
		});
	}

	//gets and returns the stream's category (what we are playing/doing for stream)
	async getCategory(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let streamCategory = body.data[0].game_name;
			let msg = `@${user.username}: Current category is ${streamCategory}`;
			this.client.say(target, msg);
		});
	}

	async getClipInformation(client_id, access_token, clip_id) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = "https://api.twitch.tv/helix/clips" + `?id=${clip_id}`;

		await fetch(url, data).then(result => result.json()).then(body => {
			if (body.data[0].url != undefined) {
				let u = `<a href="${body.data[0].url}">${body.data[0].url}</a>`;
				this.#clip_list.push(u);
			}
		});
	}

	getClipList() { return this.#clip_list; }

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

		console.log(editData);

		//send out the info and edit the channel's category
		//TODO: get this to not 401 me whenever I try to edit my own channel
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

//---------------------------------------------------------------------------------------------------------------
//-----------------------------SPOTIFY API FUNCTIONS-------------------------------------------------------------

	//gets and returns the song title and name from the streamer's currently playing songs
	async getCurrentSongTitleFromSpotify(client, target, user) {

		(await this.spotifyApi).getMyCurrentPlayingTrack()
			.then(function (data) {
				let songTitle = data.body.item.name;
				let artistName = data.body.item.artists[0].name;
				let fullMsg = "Now Playing \"" + songTitle + "\" by " + artistName;
				client.say(target, `@${user.username}: ${fullMsg}`);
			}, function (err) { console.error(err); });
	}

	//skips the current song playing on spotify and advances to next one; tells chatroom what song is
	async skipToNextSong(client, target, user) {
		(await this.spotifyApi).skipToNext()
			.then(function () {
				console.log("Skipped to next song");
			}, function (err) {
				console.error(err);
			});
		this.getCurrentSongTitleFromSpotify(client, target, user);
    }

//-----------------------------------------------------------------------------------------------------
//-------------------------MISC API/ASYNC FUNCTIONS----------------------------------------------------

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

	//gets a random wikipedia article from the wikimedia API and delivers it to chat
	async getRandWikipediaArticle(user, target) {

		const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=random&format=json&rnnamespace=0&rnlimit=1';

		try {
			const response = await axios.get(wikiUrl);
			const pageTitle = response.data.query.random[0].title.replace(/ /g, "_");
			const wikiPageURL = "https://en.wikipedia.org/wiki/" + pageTitle;
			this.client.say(target, `@${user.username}: Here's a link to a random wikipedia page. Have Fun! ${wikiPageURL}`);
		} catch (err) {
			console.error(err);
		}
	}

	//gets a random word, what the word is grammatically, and its definition and sends that to the chatroom
	async getRandomWordFromDictionary(user, target) {

		const merrWebAPIKey = process.env.DICTIONARY_API_KEY;

		//we can't get a random word through the dictionary API, so we get it through a different, free API
		const randomWordURL = `https://random-words-api.herokuapp.com/w?n=1`;

		var grAbbrev = "";//the abbreviation of the grammatical function of the word

		try {
			//get the word, and then use it to get the other parts of the message from Merriam-Webster
			const wordResponse = await axios.get(randomWordURL);
			const word = wordResponse.data[0];
			const dictionaryURL = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${merrWebAPIKey}`;
			const response = await axios.get(dictionaryURL);
			const definition = response.data[0].shortdef[0];
			const grammarFunction = response.data[0].fl;

			//now we get the abbreviation of the grammar function to shorten the chat message
			switch (grammarFunction) {
				case "verb":
					grAbbrev = "v";
					break;
				case "noun":
					grAbbrev = "n";
					break;
				case "adjective":
					grAbbrev = "adj";
					break;
				case "adverb":
					grAbbrev = "adv";
					break;
				case "pronoun":
					grAbbrev = "prn";
					break;
				case "trademark":
					grAbbrev = "®";
					break;
				case "abbreviation":
					grAbbrev = "abbrev";
					break;
				case "preposition":
					grAbbrev = "prep";
					break;
				case "conjunction":
					grAbbrev = "conj";
					break;
				case "interjection":
					grAbbrev = "intj";
					break;
				default://need to see what pops out through here to get the abbreviaiton correct for this
					grAbbrev == grammarFunction;
					break;
			}

			this.client.say(target, `@${user.username}: ${word}: ${grAbbrev}; ${definition}`);

		} catch (err) { console.error(err); }

    }

//---------------------------------------------------------------------------------------------------------------
//------------------------------------INITIALIZERS---------------------------------------------------------------

	//simple helper function for setting up a basic Helix API header using provided values
	//made so I have to do less typing/make less redundant code
	#createTwitchDataHeader(client_id, access_token) {
		return {
			'method': 'GET',
			'headers': {
				'client-id': `${client_id}`,
				'Authorization': `Bearer ${access_token}`
			}
		};
	}

	//understand that the functions below are meant for my own personal use and will most likely not make an
	//appearance in the version of the repo that gets used in multiple channels

	//gets a token for the Helix API that will let me edit my own channel's info (title, tags, category, etc.)
	async #getTwitchToken(client_id, client_secret, scopes, redirect_url, state) {
		//first, we get the auth code to get the request token
		let data = {
			'method': 'GET'
		};
		let url = `https://id.twitch.tv/oauth2/authorize?client_id=${client_id}&redirect_uri=${redirect_url}&response_type=code&scope=${scopes}&state=${state}`;

		console.log(url);

		await fetch(url, data).then(result => result.json()).then(body => {
			console.log(body);
		});

		let code = process.env.TWITCH_CODE;

		let post_url = `https://id.twitch.tv/oauth2/token?client_id=${client_id}&client_secret=${client_secret}&code=${code}&grant_type=authorization_code&redirect_uri=${redirect_url}`;
		let post_data = {
			'method': 'POST'
		};

		await fetch(post_url, post_data).then(result => result.json()).then(body => {
			console.log(body);
		});
    }

	//initializes all spotify stuff that we will need when we do calls to its API
	async #initSpotifyStuff() {

		var refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
		//var access_token = process.env.SPOTIFY_TOKEN;

		//first, we get an access token from the API
		var spotifyData = new SpotifyWebApi({
			redirectUri: process.env.SPOTIFY_REDIRECT_URL,
			clientId: process.env.SPOTIFY_CLIENT_ID,
			clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
		});

		//when need new access token, uncomment and roll
		//var scopes = ['user-read-private', 'user-read-currently-playing', 'user-modify-playback-state'];
		//var state = "some-type-of-creature";
		//var auth_url = spotifyData.createAuthorizeURL(scopes, state);

		//try {
		//	console.log(auth_url);
		//	const response = await axios.get(auth_url);
		//	console.log(response);
		//	var code = response.code;
		//	console.log(code);

		//} catch (err) { console.error(err); }



		//spotifyData.authorizationCodeGrant(code).then(
		//	function (data) {
		//		console.log('The token expires in ' + data.body['expires_in']);
		//		console.log('The access token is ' + data.body['access_token']);
		//		console.log('The refresh token is ' + data.body['refresh_token']);

		//		// Set the access token on the API object to use it in later calls
		//		spotifyData.setAccessToken(data.body['access_token']);
		//		spotifyData.setRefreshToken(data.body['refresh_token']);
		//	},
		//	function (err) {
		//		console.log('Something went wrong!', err);
		//	}
		//);

		spotifyData.setRefreshToken(refresh_token);

		spotifyData.refreshAccessToken().then(
			function (data) {
				//console.log('The access token has been refreshed!');

				// Save the access token so that it's used in future calls
				spotifyData.setAccessToken(data.body['access_token']);
			},
			function (err) {
				console.log('Could not refresh access token', err);
			}
		);

		return spotifyData;
	}
//--------------------------------------------------------------------------------------------------------
}

module.exports = AsyncHolder;
