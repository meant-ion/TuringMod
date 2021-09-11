// file that holds all async functions that the bot will be using
//i.e. !followage, !post, etc...
require('dotenv').config({ path: './.env' });

const fetch = require('node-fetch');
const h = require('./helper.js');
const fs = require('fs');
const http = require('http');
const open = require('open');

class AsyncHolder {

	#clip_list;
	#access_token;
	#data_base;
	#nasa_get;
	#space_url;
	#spot_access;
	#spot_refresh;

	//@param   c     The bot's Twitch client
	//@param   c_i   The bot's client ID
	//@param   c_s   The bot's client secret
	//@param   s     The bot's list of scopes
	//@param   r_u   The bot's redirect URL
	//@param   s_s   The bot's state secret
	//@param   d_b   The bot's client for accessing its database
	constructor(c, c_i, c_s, s, r_u, s_s, d_b) {
		this.client = c;
		this.helper = new h();
		this.#data_base = d_b;
		this.#clip_list = [];
		this.#nasa_get = undefined;//date object; undefined until we get a call to the NASA API
		this.#space_url = "";
		this.#getTwitchToken(c_i, c_s, s, r_u, s_s);
		setInterval(this.#refreshTwitchTokens, 3600000);//refreshes our oauth tokens every hour or so. Resets when the bot goes down
		this.#initSpotifyStuff();
		setInterval(this.#refreshSpotifyToken, 3600000);//refreshes our spotify oauth tokens every hour, and resets when the bot goes down
    }

//--------------------------------------TWITCH API FUNCTIONS-------------------------------------------------------------



	//returns the length of time the asking user has been following the channel. Currently needs to be said in chat rather than in
	//a whisper, need to have the bot verified for that and need to make sure that all necessary parameters are met for it also
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getFollowAge(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		await fetch('https://api.twitch.tv/helix/users/follows?to_id=71631229', data).then(result => result.json())
			.then(body => {
				//loop through the list of followers to find the one that requested their follow age
				for (let i = 0; i < body.data.length; ++i) {
					if (body.data[i].from_login == user.username) {
						let followedDate = new Date(body.data[i].followed_at);
						this.client.say(target, `@${user.username} has been following for:` 
							+ `${this.helper.getTimePassed(followedDate, true)}`);
					}
				}

		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getChannelSchedule(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		await fetch('https://api.twitch.tv/helix/schedule?broadcaster_id=71631229&utc_offset=-300&first=6', data).then(result => result.json())
			.then(body => {

				let streamDates = "";
				for (let i = 1; i < body.data.segments.length; ++i) {
					let curDate = new Date(body.data.segments[i].start_time);
					if (i + 1 == body.data.segments.length) {
						streamDates += curDate.toDateString();
					} else {
						streamDates += curDate.toDateString() + ", ";
                    }
					
				}
				this.client.say(target, `@${user.username}: Streams for the next week starting today are on ${streamDates}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets and returns the channel owner's summary/bio
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getChannelSummary(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		await fetch('https://api.twitch.tv/helix/users?id=71631229', data).then(result => result.json()).then(body => {
			this.client.say(target, `@${user.username}: ${body.data[0].description}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets and returns the total time the stream has been live. If channel isn't live, returns a message saying so
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getStreamUptime(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

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
			
        }).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets and returns the title of the stream
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getStreamTitle(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
			this.client.say(target, `@${user.username} Title is: ${body.data[0].title}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getUserAcctAge(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		const url = `https://api.twitch.tv/helix/users?login=${user.username}`;

		await fetch(url, data).then(result => result.json()).then(body => {
			let acctCreateDate = new Date(body.data[0].created_at);
			let timePassed = this.helper.getTimePassed(acctCreateDate, true);
			this.client.say(target, `@${user.username}, your account is ${timePassed} old`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//gets and returns the stream's category (what we are playing/doing for stream)
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getCategory(client_id, user, target) {
		const data = this.#createTwitchDataHeader(client_id);

		const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

		await fetch(url, data).then(result => result.json()).then(body => {
			this.client.say(target, `@${user.username}: Current category is ${body.data[0].game_name}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	//Gets info on a specific clip via its ID and sends that to a list of them
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   clip_id        The ID of the potential clip we want to get info on
	async getClipInformation(client_id, clip_id) {
		const data = this.#createTwitchDataHeader(client_id);

		const url = "https://api.twitch.tv/helix/clips" + `?id=${clip_id}`;

		await fetch(url, data).then(result => result.json()).then(body => {
			if (body.data[0].url != undefined) {
				//let u = `<a href="${body.data[0].url}">${body.data[0].url}</a>`;
				this.#clip_list.push(`<a href="${body.data[0].url}">${body.data[0].url}</a>`);
			}
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
	}

	getClipList() { return this.#clip_list; }

	//edits the channel category/game to one specified by a moderator
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   gameName       The name of the category that we wish to change the stream over to
	async editChannelCategory(client_id, user, gameName, target) {
		const data = this.#createTwitchDataHeader(client_id);

		gameName = gameName.slice(1);
		gameName = gameName.replace(/&/g, "%26");

		//first, we need to get the category id to change the channel's category
		const gameIdURL = `https://api.twitch.tv/helix/games?name=` + `${gameName}`;

		let gameID = "";
		let editChannelURL = "";

		await fetch(gameIdURL, data).then(result => result.json()).then(body => {
			gameID = body.data[0].id;
			editChannelURL = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
			return;
		});

		//secondary data structure is meant for the editing, since we have to use PATCH and not GET
		const editData = {
			'method': 'PATCH',
			'headers': {
				'Authorization': `Bearer ${this.#access_token}`,
				'Client-Id': `${client_id}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify({
				"game_id": gameID,
            }),
		};

		//send out the info and edit the channel's category
		await fetch(editChannelURL, editData).then(result => result.text()).then(body => {
			this.client.say(target, `@${user.username}: Category Successfully Updated`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});	
	}

	//edits the stream's title to one requested by streamer/moderator
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   title          The title we wish to now use on the stream
	async editStreamTitle(client_id, title, target) {
		const url  =`https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

		//nothing fancy like editing the category, we just make the header and use the provided title for updating
		const edit_data = {
			'method': 'PATCH',
			'headers': {
				'Authorization': `Bearer ${this.#access_token}`,
				'Client-Id': `${client_id}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify({
				'title': title
			}),
		};

		//send out the request and tell if there's been an issue on their end
		await fetch(url, edit_data).then(result => result.text()).then(body => {
			this.client.say(target, `@${user.username}: Title successfully updated!`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		})
	}

	//grabs a list of all members in the chatroom currently and times random ones out for a short time
	//to be seriously used when there is enough people to actually use it on
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   target         The chatroom that the message will be sent into
	async shotgunTheChat(client_id, target) {
		const url = `https://tmi.twitch.tv/group/user/pope_pontus/chatters`;

		const data = this.#createTwitchDataHeader(client_id);

		this.client.say(target, "Uh oh, someone fired the banhammer off again!");

		//get the number of people hit by the shotgun "pellets"
		const victims = Math.floor(Math.random() * 5) + 1;

		//now get the list of "victims" and choose, at random, who gets hit
		await fetch(url, data).then(result => result.json()).then(body => {
			let list = body.chatters.viewers;
			console.log(body.chatters.viewers);

			//with the list gathered, loop through each time and time out the member all at once
			for (i = 0; i < victims; ++i) {
				let victim_index = Math.floor(Math.random() * list.length);

				let victim_name = list[victim_index];

				this.client.timeout(target, victim_name, 10, `@${victim_name} has been hit by the blast!`);
			}
		});
	}

//---------------------------------------------------------------------------------------------------------------
//-----------------------------SPOTIFY API FUNCTIONS-------------------------------------------------------------

	//gets and returns the song title and name from the streamer's currently playing songs
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getCurrentSongTitleFromSpotify(target, user) {

		const url = `https://api.spotify.com/v1/me/player/currently-playing`;

		//header for everything that we need
		const data = {
			'method': 'GET',
			'headers': {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.#spot_access}`
			}
		};

		//get the data from the API and send out the relevant bits to chat
		await fetch(url, data).then(result => result.json()).then(body => {
			this.client.say(target, `@${user.username}: Now Playing "${body.item.name}" by ${body.item.artists[0].name}`);
		}).catch(err => {
			console.error(err);
			this.client.say(target, "Unable to get title of song");
		});

	}

	//skips the current song playing on spotify and advances to next one; tells chatroom what song is
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async skipToNextSong(target, user) {
		const url = `https://api.spotify.com/v1/me/player/next`;

		const data = {
			'method': 'GET',
			'headers': {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.#spot_access}`
			}
		};

		console.log(this.#spot_access);

		await fetch(url, data).then(result => result.text()).then(body => {
			console.log(body);
			this.getCurrentSongTitleFromSpotify(target, user);
		});

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
			sugg.forEach(item => {
				msg += item + ', ';
			});
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
		const target_abbrev = target_currency.toUpperCase();
		const currency_url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATES_API_KEY}/latest/${start_abbrev}`;

		//get the rates from the api and then do the conversion by multiplication
		await fetch(currency_url).then(result => result.json()).then(body => {
			const rate = Number(body.conversion_rates[target_abbrev]);
			let msg = `@${user.username}: ${amt} ${start_abbrev} is equivalent to ${this.helper.roundToTwoDecimals(amt * rate)} ${target_abbrev}`;
			this.client.say(target, msg);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});

	}

	//gets a random wikipedia article from the wikimedia API and delivers it to chat
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getRandWikipediaArticle(user, target) {

		const wiki_url = 'https://en.wikipedia.org/w/api.php?action=query&list=random&format=json&rnnamespace=0&rnlimit=1';

		await fetch(wiki_url).then(result => result.json()).then(body => {
			const page_title = body.query.random[0].title.replace(/ /g, "_");
			const wiki_page_url = "https://en.wikipedia.org/wiki/" + page_title;
			this.client.say(target, `@${user.username}: Here's a link to a random wikipedia page. Have Fun! ${wiki_page_url}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});

	}

	//Function that gathers data about the changes from this bot's GitHub repo and sends it to chat
	//@param   target   The chatroom that the message will be sent in to
	async getGithubRepoInfo(target) {
		const github_url = 'https://api.github.com/repos/meant-ion/TuringMod/commits';
		let current_repo_info, last_repo_info = undefined;//the URLS for the repos we need
		let current_repo_stats, last_repo_stats = undefined;//the info that the repos have

		//fetch the statistics we need from github via its web API
		await fetch(github_url).then(result => result.json()).then(body => {
			current_repo_info = body[0].url;
			last_repo_info = body[1].url;
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
			return;
		});

		await fetch(current_repo_info).then(result => result.json()).then(body => { current_repo_stats = body.stats; }).catch(err => {
			this.#generateAPIErrorResponse(err, target);
			return;
		});

		await fetch(last_repo_info).then(result => result.json()).then(body => { last_repo_stats = body.stats; }).catch(err => {
			this.#generateAPIErrorResponse(err, target);
			return;
		});

		//set up what's gonna hold our data in place
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
	}

	//gets a random pokemon from the list of all pokemon and returns its flavor text
	//@param   target   The name of the chatroom that the message will be posted in
	async getRandomPokemon(target) {
		//get our requesting URL and its headers in a row and go from there
		//As of 8/22/2021, according to Bulbapedia, there are 898 separate entries for pokemon for the "National Pokedex"
		let pokemon_id = Math.floor(Math.random() * 898) + 1;
		const pokemon_url = `https://pokeapi.co/api/v2/pokemon-species/${pokemon_id}/`;
		let en_array = ["", "", ""];

		await fetch(pokemon_url).then(result => result.json()).then(body => {
			//arrays of all the entries in various languages for the pokemon's data
			const pokemon_name_array = body.names;
			const flavor_text_array = body.flavor_text_entries;
			const genus_array = body.genera;

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
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});

	}

	//gets a fact about a random number, either of trivia, math, a date, or a year
	//@param   target   The name of the chatroom that the message will be posted in
	async getRandomNumberFact(target) {

		//from the list below, get a random type for us to get info on and paste it to url
		const types_array = ["trivia", "math", "date", "year"];

		const number_url = `http://numbersapi.com/random/${types_array[Math.floor(Math.random() * types_array.length)]}?notfound=floor`;

		//now just get the data and post it, this API isn't terribly complex
		await fetch(number_url).then(result => result.text()).then(body => {
			this.client.say(target, body);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});

	}

	//gets a random word, what the word is grammatically, and its definition and sends that to the chatroom
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getRandomWordFromDictionary(user, target) {

		const merrWebAPIKey = process.env.DICTIONARY_API_KEY;

		//we can't get a random word through the dictionary API, so we get it through a different, free API
		const randomWordURL = `https://random-words-api.herokuapp.com/w?n=1`;
		let dictionary_url = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/";
		let word = "";

		let gr_abbrev = "";//the abbreviation of the grammatical function of the word

		//get the random word first for us to get access to the definition of it
		await fetch(randomWordURL).then(result => result.json()).then(body => {
			word = body[0];
			dictionary_url += `${word}?key=${merrWebAPIKey}`;
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
			return;
		});

		//now we get the data on the word
		await fetch(dictionary_url).then(result => result.json()).then(body => {

			const definition = body[0].shortdef[0];
			const grammar_function = body[0].fl;

		//now we get the abbreviation of the grammar function to shorten the chat message
		 	switch (grammar_function) {
		 		case "verb":
		 			gr_abbrev = "v";
		 			break;
		 		case "noun":
					gr_abbrev = "n";
		 			break;
		 		case "adjective":
					gr_abbrev = "adj";
		 			break;
		 		case "adverb":
					gr_abbrev = "adv";
					break;
		 		case "pronoun":
					gr_abbrev = "prn";
		 			break;
		 		case "trademark":
					gr_abbrev = "�";
		 			break;
		 		case "abbreviation":
		 			grAbbrev = "abbrev";
		 			break;
		 		case "preposition":
					gr_abbrev = "prep";
		 			break;
		 		case "conjunction":
					gr_abbrev = "conj";
		 			break;
		 		case "interjection":
					gr_abbrev = "intj";
		 			break;
		 		default://need to see what pops out through here to get the abbreviaiton correct for this
				 gr_abbrev == grammar_function;
					break;
		 	}
			 this.client.say(target, `@${user.username}: ${word}: ${gr_abbrev}; ${definition}`);
		}).catch(err => {
			this.#generateAPIErrorResponse(err, target);
		});
    }

	//gets the NASA Space image of the day and sends it out to the chat room as a URL
	//@param   api_key   The API key needed to get access to NASA's APIs
	//@param   target    The name of the chatroom we are posting the photo into
	async getNASAPicOfTheDay(api_key, target) {
		let url = `https://api.nasa.gov/planetary/apod?api_key=${api_key}`;

		//we have gotten the space image URL at least once today
		if (this.#nasa_get != undefined) {
			let cur_date = new Date();
			if (cur_date.getTime() - this.#nasa_get.getTime() > 86400000) {//more than 24 hours have passed since the last call here
				await fetch(url).then(result => result.json()).then(body => {
					this.#space_url = body.hdurl;
				}).catch(err => {
					this.#generateAPIErrorResponse(err, target);
				});
			}
		} else {//we havent gotten the image yet as of launch, so get it immediately
			await fetch(url).then(result => result.json()).then(body => {
				this.#space_url = body.hdurl;
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		}

		//assuming that there was something to get, we send out the link
		if (this.#space_url != "") {
			this.client.say(target, `Here is NASA's Space Photo of the Day! ${this.#space_url}`);
		} else {
			this.client.say(target, `Error retrieving NASA's Space Photo of the Day`);
		}

		
	}

//---------------------------------------------------------------------------------------------------------------
//------------------------------------INITIALIZERS/PRIVATE FUNCTIONS---------------------------------------------

	//simple helper function for setting up a basic Helix API header using provided values
	//made so I have to do less typing/make less redundant code
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@returns                A header object in the correct format for accessing the Helix API
	#createTwitchDataHeader(client_id) {
		return {
			'method': 'GET',
			'headers': {
				'client-id': `${client_id}`,
				'Authorization': `Bearer ${this.#access_token}`
			}
		};
	}


	//simple helper for generating an error so I don't have to type as much
	//@param   err      The error that has been generated
	//@param   target   The name of the chatroom we are posting to
	#generateAPIErrorResponse(err, target) {
		this.client.say(target, "Error: API currently not responding");
		console.error(err);
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
	async #getTwitchToken(client_id, client_secret, scopes, redirect_url, state) {

		//all necessary vars needed to get the auth token so we can get the request token
		let post_data = {
			'method': 'POST'
	   	};
		let url = `https://id.twitch.tv/oauth2/authorize?client_id=${client_id}&redirect_uri=${redirect_url}&response_type=code&scope=${scopes}&state=${state}`;

		let code, post_url;

		//first, we get the auth code to get the request token via getting a server up and running
		let s = http.createServer((req, res) => {
			let u = new URL(req.url, "http://localhost:3000");
			if (u.searchParams.get('code') != null) {
				code = u.searchParams.get('code');
			}
			post_url = `https://id.twitch.tv/oauth2/token?client_id=${client_id}&client_secret=${client_secret}&code=${code}&grant_type=authorization_code&redirect_uri=${redirect_url}`;
			res.end();
		}).listen(3000);

		//open up the page to get access to the auth code
		await open(url, {wait:true}).then(console.log("* Page opened"));

		//with the auth code now gotten, send a request to Helix to get the JSON object holding the codes we need
		//TODO: get these stored into a database
		await fetch(post_url, post_data).then(result => result.json()).then(body => {
			this.#access_token = body.access_token;
			this.#data_base.writeTwitchTokensToDB(this.#access_token, body.refresh_token);
			console.log("* Full OAuth Access Token to Helix API Accquired");
		}).catch(err => {
		 	this.#generateAPIErrorResponse(err, "pope_pontus");
		});

		s.close();
    }

	//When called (i.e. when an API call fails or every 2 hours or so while active) it will query the Helix API and get us a new access token when needed
	async #refreshTwitchTokens() {
		//standard data object so the API knows we're refreshing the token we got
		let data = {
			'method': 'POST'
	   	};

		//from the DB object passed into the class, we grab the refresh token we're gonna need for this to work
		let refresh_token = this.#data_base.getTwitchInfo(1);

		//get the client secret and all that fun stuff so we can make the proper request
		let client_stuff = this.#data_base.getIdAndSecret();

		let url = `https://id.twitch.tv/oauth2/token--data-urlencode?grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${client_stuff[0]}&client_secret=${client_stuff[1]}`;
		
		//send the request and write the tokens to the DB for safe keeping
		await fetch(url, data).then(result => result.json()).then(body => {
			if (body.status == null) {
				this.#data_base.writeTwitchTokensToDB(body.access_token, body.refresh_token)
			}
		});
	}

	//initializes all spotify stuff that we will need when we do calls to its API
	async #initSpotifyStuff() {

		//create our constants for getting the info we need
		const spotify_id = process.env.SPOTIFY_CLIENT_ID;
		const spotify_secret = process.env.SPOTIFY_CLIENT_SECRET;
		const spotify_redirect_url = process.env.SPOTIFY_REDIRECT_URL;
		const scopes = 'user-read-private%20user-read-currently-playing%20user-modify-playback-state';
		const state = "some-type-of-creature";

		//build the URLS that we need to access for the requests
		const url = `https://accounts.spotify.com/authorize?client_id=${spotify_id}&response_type=code&redirect_uri=${spotify_redirect_url}&scope=${scopes}&state=${state}`;

		let token_url = 'https://accounts.spotify.com/api/token';

		let code, encoded_header, params;

		//build the server and have it automatically gather the info we need when getting our code
		let s = http.createServer((req, res) => {

			//get the auth code
			let u = new URL(req.url, "http://localhost:4000");
			if (u.searchParams.get('code') != null) {
				code = u.searchParams.get('code');
			}

			//build the items necessary to get the tokens
			let b = Buffer.from(spotify_id + ':' + spotify_secret, 'utf-8')
			encoded_header = {
				'Authorization': `Basic ${b.toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			};
			params = {
				'code': code,
				'grant_type': "authorization_code",
				'redirect_uri': spotify_redirect_url,
			}
			res.end();
		}).listen(4000);

		//open the url and get what we want from it
		await open(url, { wait: true }).then(console.log("* Spotify Test Page Opened!"));

		//with all data gathered, we send out a fetch request and get the tokens stored
		//TODO: get these tokens sent into a DB for better safe keeping
		await fetch(token_url, { method: 'POST', headers: encoded_header, body: new URLSearchParams(params).toString()} )
		.then(result => result.json()).then(body => {
			this.#spot_access = body.access_token;
			this.#spot_refresh = body.refresh_token;
			console.log("* Spotidy Tokens Get!");
		}).catch(err => { console.error(err); });

		s.close();
	}

	//refreshes the Spotify Web API access tokens after they have expired in one hour after generation
	async #refreshSpotifyToken() {
		//get the url, the header, and the body parameters set up for the request
		const token_url = "https://accounts.spotify.com/api/token";
		const b = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET, 'utf-8')
		const encoded_header = {
			'Authorization': `Basic ${b.toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		};
		const params = {
			'code': this.#spot_refresh,
			'grant_type': "refresh_token",
		};

		//push through the request and retrieve our new access token
		await fetch(token_url, { method: 'POST', headers: encoded_header, body: new URLSearchParams(params).toString()} )
		.then(result => result.json()).then(body => {
			this.#spot_access = body.access_token; //no need to get a new refresh token, that's ours now. Just a new access token
		});
	}
//--------------------------------------------------------------------------------------------------------
}

module.exports = AsyncHolder;
