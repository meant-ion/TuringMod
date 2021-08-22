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

	//@param   c     The bot's Twitch client
	//@param   c_i   The bot's client ID
	//@param   c_s   The bot's client secret
	//@param   s     The bot's list of scopes
	//@param   r_u   The bot's redirect URL
	//@param   s_s   The bot's state secret
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
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getFollowAge(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		let follower_list = undefined;

		await fetch('https://api.twitch.tv/helix/users/follows?to_id=71631229', data).then(result => result.json())
			.then(body => {
				follower_list = body;
				for (let i = 0; i < follower_list.data.length; ++i) {
					if (follower_list.data[i].from_login == user.username) {
						let followedDate = new Date(follower_list.data[i].followed_at);
						this.client.say(target, `@${user.username} has been following for:` 
							+ `${this.helper.getTimePassed(followedDate, true)}`);
					}
				}

		});
	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getChannelSchedule(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		let schedule = undefined;

		await fetch('https://api.twitch.tv/helix/schedule?broadcaster_id=71631229&utc_offset=-300&first=6', data).then(result => result.json())
			.then(body => {

				schedule = body;
				let streamDates = "";
				for (let i = 1; i < schedule.data.segments.length; ++i) {
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
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getChannelSummary(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/users?id=71631229', data).then(result => result.json()).then(body => {
			let description = body.data[0].description;
			this.client.say(target, `@${user.username}: ${description}`);
		});
	}

	//gets and returns the total time the stream has been live. If channel isn't live, returns a message saying so
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
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
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getStreamTitle(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			let streamTitle = body.data[0].title;
			this.client.say(target, `@${user.username} Title is: ${streamTitle}`);
		});
	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
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
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getCategory(client_id, access_token, user, target) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let streamCategory = body.data[0].game_name;
			let msg = `@${user.username}: Current category is ${streamCategory}`;
			this.client.say(target, msg);
		});
	}

	//Gets info on a specific clip via its ID and sends that to a list of them
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   clip_id        The ID of the potential clip we want to get info on
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
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@param   user           The name of the chat member that typed in the command
	//@param   gameName       The name of the category that we wish to change the stream over to
	async editChannelCategory(client_id, access_token, user, gameName) {
		const data = this.#createTwitchDataHeader(client_id, access_token);

		gameName = gameName.slice(1);
		gameName = gameName.replace(/&/g, "%26");

		//first, we need to get the category id to change the channel's category
		const gameIdURL = `https://api.twitch.tv/helix/games?name=` + `${gameName}`;

		let responseStatus;

		let gameID = "";
		let editChannelURL = "";

		await fetch(gameIdURL, data).then(result => result.json()).then(body => {
			gameID = body.data[0].id;
			editChannelURL = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		});

		//now that we have the game id, we can make the patch request and go from there
		let res;

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
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getCurrentSongTitleFromSpotify(target, user) {

		(await this.spotifyApi).getMyCurrentPlayingTrack()
			.then(function (data) {
				let songTitle = data.body.item.name;
				let artistName = data.body.item.artists[0].name;
				let fullMsg = "Now Playing \"" + songTitle + "\" by " + artistName;
				this.client.say(target, `@${user.username}: ${fullMsg}`);
			}, function (err) { console.error(err); });
	}

	//skips the current song playing on spotify and advances to next one; tells chatroom what song is
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async skipToNextSong(target, user) {
		(await this.spotifyApi).skipToNext()
			.then(function () {
				console.log("Skipped to next song");
			}, function (err) {
				console.error(err);
			});
		this.getCurrentSongTitleFromSpotify(target, user);
    }

//-----------------------------------------------------------------------------------------------------
//-------------------------MISC API/ASYNC FUNCTIONS----------------------------------------------------

	//returns a list of all suggestions sent into the bot as a message in chat
	//@param   user   The chat member that typed in the command
	async printAllSuggestions(user) {
		let msg = "";
		fs.readFile('./data/suggestions.txt', function (err, data) {
			if (err) { console.error(err); }

			let suggs = data.toString();
			let sugg = suggs.split('\n');
			for (let i = 0; i < sugg.length; ++i) {
				msg += sugg[i] + ', ';
			}
		});
		this.client.say(this.target, `@${user.username}: ${msg}`);
	}

	//Using the free ExchangeRatesAPI, we can get the conversion rates from one currrency to another; most likely to staple this into a conversion calculator
	//@param   user              The chat member that typed in the command
	//@param   target            The chatroom that the message will be sent into
	//@param   start_currency    The abbreviation of the currency we're converting from
	//@param   target_currency   The abbreviation of the currency we're converting to
	//@param   amt               The amount of currency we're converting from the starting currency to the target
	async getCurrencyExchangeRate(user, target, start_currency, target_currency, amt) {
		const start_abbrev = start_currency.toUpperCase();
		const currency_url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATES_API_KEY}/latest/${start_abbrev}`;

		//get the rates from the api and then do the conversion by multiplication
		try {
			const response = await axios.get(currency_url);
			const target_abbrev = target_currency.toUpperCase();
			const rate = Number(response.data.conversion_rates[target_abbrev]);
			let msg = `@${user.username}: ${amt} ${start_abbrev} is equivalent to ${this.helper.roundToTwoDecimals(amt * rate)} ${target_abbrev}`;
			this.client.say(target, msg);
		} catch (err) { console.error(err); }
	}

	//gets a random wikipedia article from the wikimedia API and delivers it to chat
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
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

	//Function that gathers data about the changes from this bot's GitHub repo and sends it to chat
	//@param   target   The chatroom that the message will be sent in to
	async getGithubRepoInfo(target) {
		const github_url = 'https://api.github.com/repos/meant-ion/TuringMod/commits';
		try {
			//get the info that we need to do these calculations
			const response = await axios.get(github_url);
			const current_repo_info = await axios.get(response.data[0].url);
			const last_repo_info = await axios.get(response.data[1].url);//the previous commit before the current one
			const current_repo_stats = current_repo_info.data.stats;
			const last_repo_stats = last_repo_info.data.stats;

			//set up the arrays for composing the message
			let indicators = ["", "", ""];
			let percentages_array = [0, 0, 0];
			let current_array = this.helper.getGitStatsArray(current_repo_stats);
			let last_array = this.helper.getGitStatsArray(last_repo_stats);

			//going through each item in the current_array and last_array, calculate the % change and push to percentages_array
			for (let i = 0; i < percentages_array.length; ++i) {

				let current_val = Number(current_array[i]);
				let last_val = Number(last_array[i]);
				let temp_percent = 0;
				let temp_indic = "";

				if (current_val > last_val) {//more changes on current repo than last

					temp_indic = "up";
					temp_percent = this.helper.roundToTwoDecimals((current_val / last_val) * 100);

				} else if (current_val < last_val) {//more changes on last repo than current

					temp_indic = "down";
					temp_percent = this.helper.roundToTwoDecimals((last_val / current_val) * -100);

				} else {//no change in amount of changes for both repos

					temp_indic = "with no change";

				}

				indicators[i] = temp_indic;
				percentages_array[i] = temp_percent;

			}

			//now we make the abomination of a message and send it out to the chatroom
			let message = `Current commit has ${current_array[0]} changes, ${indicators[0]} from last repo's ${last_array[0]} changes ` 
					+ `(${percentages_array[0]}% difference). ` +
					`Of the current total, ${current_array[1]} were additions (${indicators[1]} from last repo's ${last_array[1]} ` 
					+ `(${percentages_array[1]}% difference))` + 
					` and ${current_array[2]} were deletions (${indicators[2]} from last repo's ${last_array[2]} ` 
					+ `(${percentages_array[2]}% difference))`;

			this.client.say(target, message);

		} catch (err) { console.error(err); }
	}

	//gets a random pokemon from the list of all pokemon and returns its flavor text
	//@param   target   The name of the chatroom that the message will be posted in
	async getRandomPokemon(target) {
		//get our requesting URL and its headers in a row and go from there
		//As of 8/22/2021, according to Bulbapedia, there are 898 separate entries for pokemon for the "National Pokedex"
		let pokemon_id = Math.floor(Math.random() * 898) + 1;

		try {

			//get the response from the pokemon API
			const response = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon_id}/`);
			
			//holds the english name, genus, and flavor text of the random pokemon
			let en_array = ["", "", ""];

			//arrays of all the entries in various languages for the pokemon's data
			const pokemon_name_array = response.data.names;
			const flavor_text_array = response.data.flavor_text_entries;
			const genus_array = response.data.genera;

			//now, we search through the entries for the correct (read: in english) versions of them
			flavor_text_array.forEach(item => {
				if (this.#isLangEn(item)) {
					en_array[2] = item.flavor_text;
				}
			});
			genus_array.forEach(item => {
				if (this.#isLangEn(item)) {
					en_array[1] = item.genus;
				}
			});
			pokemon_name_array.forEach(item => {
				if (this.#isLangEn(item)) {
					en_array[0] = item.name;
				}
			});
			let msg = "Entry #" + pokemon_id + ": " + en_array[0] + ", The " + en_array[1] + "; " + en_array[2];
			this.client.say(target, msg);

		} catch (err) { console.error(err); }
	}

	//gets a fact about a random number, either of trivia, math, a date, or a year
	//@param   target   The name of the chatroom that the message will be posted in
	async getRandomNumberFact(target) {

		//from the list below, get a random type for us to get info on and paste it to url
		const types_array = ["trivia", "math", "date", "year"];
		let type_index = Math.floor(Math.random() * types_array.length);

		const number_url = `http://numbersapi.com/random/${types_array[type_index]}?notfound=floor`;

		//now just get the data and post it, this API isn't terribly complex
		try {

			const response = await axios.get(number_url);
			this.client.say(target, response.data);

		} catch (err) { console.error(err); }
	}

	//gets a random word, what the word is grammatically, and its definition and sends that to the chatroom
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getRandomWordFromDictionary(user, target) {

		const merrWebAPIKey = process.env.DICTIONARY_API_KEY;

		//we can't get a random word through the dictionary API, so we get it through a different, free API
		const randomWordURL = `https://random-words-api.herokuapp.com/w?n=1`;

		let grAbbrev = "";//the abbreviation of the grammatical function of the word

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
					grAbbrev = "�";
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
//------------------------------------INITIALIZERS/PRIVATE FUNCTIONS---------------------------------------------

	//simple helper function for setting up a basic Helix API header using provided values
	//made so I have to do less typing/make less redundant code
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   access_token   The bot's access token so its requests are valid
	//@returns                A header object in the correct format for accessing the Helix API
	#createTwitchDataHeader(client_id, access_token) {
		return {
			'method': 'GET',
			'headers': {
				'client-id': `${client_id}`,
				'Authorization': `Bearer ${access_token}`
			}
		};
	}

	//simple function that returns if the language of item is english
	//@param   item   The object we are looking at to determine its language
	//@return         True/False
	#isLangEn(item) { return item.language.name == "en" }

	//understand that the functions below are meant for my own personal use and will most likely not make an
	//appearance in the version of the repo that gets used in multiple channels

	//gets a token for the Helix API that will let me edit my own channel's info (title, tags, category, etc.)
	//@param   client_id       The bot's Twitch ID, so we can get to the API easier
	//@param   client_secret   The bot's Twitch password so it can get a token
	//@param   scopes          A list of all needed scopes for the Helix API so we can make certain requests
	//@param   redirect_url    The URL that the user will be redirected to so we can get the auth code needed to generate the token
	//@param   state           Security measure for the Twitch API to avoid certain attacks
	//@returns                 An OAuth Access Token, so we can read and write info to Twitch's servers
	async #getTwitchToken(client_id, client_secret, scopes, redirect_url, state) {
		//first, we get the auth code to get the request token
		let data = {
			'method': 'GET',
			'headers': {
				'Content-Type': 'application/json'
			}
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
	//@returns   A new Spotify Web API client for use with the !song and !skipsong commands
	async #initSpotifyStuff() {

		let refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
		//var access_token = process.env.SPOTIFY_TOKEN;

		//first, we get an access token from the API
		let spotifyData = new SpotifyWebApi({
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
