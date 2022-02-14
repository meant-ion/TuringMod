import fetch from 'node-fetch';
import Helper from './helper.js';
import fs from 'fs';

export class MiscAPI {

    #nasa_get;
	#space_url;
    #data_base

    //@param   c     The bot's Twitch client
	//@param   d_b   The bot's client for accessing its database
    constructor(c, d_b) {
        this.client = c;
        this.#data_base = d_b;
		this.helper = new Helper();
        this.#nasa_get = undefined;//date object; undefined until we get a call to the NASA API
		this.#space_url = "";
    }

    //prints out all current suggestions within suggestions.txt and sends it to chat
	//needs testing for format and looks
	//@param    target    The name of the channel the list of suggestions is being sent to
	async getAllCurrentSuggestions(target) {
		fs.readFile('./data/suggestions.txt', 'utf8', (err, data) => {
			if (err) {
				this.client.say(target, "Error in reading from suggestions file");
				console.error(err);
			} else this.client.say(target, data);
		});
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

		try {
			const key = await this.#data_base.getAPIKeys(2);
			const currency_url = `https://v6.exchangerate-api.com/v6/${key}/latest/${start_abbrev}`;

			//get the rates from the api and then do the conversion by multiplication
			await fetch(currency_url).then(result => result.json()).then(body => {
				const rate = Number(body.conversion_rates[target_abbrev]);
				const msg = `@${user.username}: ${amt} ${start_abbrev} is equivalent to ${this.helper.roundToTwoDecimals(amt * rate), false} ${target_abbrev}`;
				this.client.say(target, msg);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }
	}

	//gets and returns the list of games on the Epic Store that have been marked down as completely free
	//@param   target   The chat room we are posting the list into
	async getFreeGamesOnEpicStore(target) {
		//finally found the URL to get the list of games from this repo here: 
		//https://github.com/kjanuska/EpicFreeGames/blob/main/check_games.js
		const epic_url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

		//generic object that will hold the whole list of games returned by the URL
		let games_arr;

		//total count of games returned 
		let games_count;

		//list of all games that are available for free through the epic store
		let complete_discounted_games_list = [];

		//get the list of games and store them for safe keeping
		try {
			await fetch(epic_url).then(result => result.json()).then(body => {
				games_arr = body.data.Catalog.searchStore.elements;
				games_count = body.data.Catalog.searchStore.paging.total;
			}).catch( err => {
				this.#generateAPIErrorResponse(err, target);
				return;
			});
		} catch (err) { console.error(err); }

		//now we begin to go through each game and see if it is one of epic's completely discounted games
		for (let i = 0; i < games_count; ++i) {
			const is_discount_zero = games_arr[i].price.totalPrice.discountPrice == 0;
			const is_not_originally_free = games_arr[i].price.totalPrice.originalPrice != 0;
			if (is_discount_zero && is_not_originally_free) 
				complete_discounted_games_list.push(games_arr[i].title);
		}

		//if there are no free games, send the message in the chat and return
		if (complete_discounted_games_list.length == 0) {
			this.client.say(target, 'Sorry, no free games found at this time :(');
			return;
		}

		//with all games found and inserted into the list, we can now compose our message
		let msg = 'The list of free games found are: ';

		//insert the games into the message 
		for (let i = 0; i < complete_discounted_games_list.length; ++i) {
			let item = complete_discounted_games_list[i];
			if (i + 1 == complete_discounted_games_list.length && complete_discounted_games_list.length > 1)
				msg += ' and ' + item;
			else if (complete_discounted_games_list.length == 1)
				msg += item;
			else 
				msg += item + '; ';	
		}

		//with the message fully composed, we now send the message out to the chatroom
		this.client.say(target, msg);

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

	//gets a random esoteric programming language (esolang) from the esolang wiki and sends the link to chat
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getRandEsoLang(user, target) {

		const eso_url = `https://esolangs.org/wiki/Special:RandomInCategory/Languages`;

		await fetch(eso_url).then(result => result.text()).then(body => {
			//split up the body (literally an HTML page), grab the title (4th line), slice off the <title> start tag,
			//and then split the rest of the string into an array based on spaces
			const l = body.split('\n')[4].slice(7).split(' ');
			let str = "";
			//we want only the name of the language, everything else is unwanted
			for (let word of l) {
				//when we get this char, we have gotten the whole name and break out
				if (word == '-') break;
				str += word + '_';
			}
			str = str.slice(0, -1);//remove the extra '_' from the string so we can get the correct title
			const url = 'https://esolangs.org/wiki/' + str;
			this.client.say(target, `@${user.username}: Here is a link to a random esolang! Enjoy! ${url}`);
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
				temp_percent = this.helper.roundToTwoDecimals((current_val / last_val) * 100, true);

			} else if (current_val < last_val) {//more changes on last repo than current

				temp_indic = "down";
				temp_percent = this.helper.roundToTwoDecimals((last_val / current_val) * -100, true);

			} else temp_indic = "with no change"; //no change in amount of changes for both repos

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
		const pokemon_id = Math.floor(Math.random() * 898) + 1;
		const pokemon_url = `https://pokeapi.co/api/v2/pokemon-species/${pokemon_id}/`;
		let en_array = ["", "", ""];

		await fetch(pokemon_url).then(result => result.json()).then(body => {
			//arrays of all the entries in various languages for the pokemon's data
			const pokemon_name_array = body.names;
			const flavor_text_array = body.flavor_text_entries;
			const genus_array = body.genera;

			//now, we search through the entries for the correct (read: in english) versions of them
			flavor_text_array.forEach(item => {
				if (this.#isLangEn(item)) en_array[2] = item.flavor_text;
			});
			genus_array.forEach(item => {
				if (this.#isLangEn(item)) en_array[1] = item.genus;
			});
			pokemon_name_array.forEach(item => {
				if (this.#isLangEn(item)) en_array[0] = item.name;
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

		//we can't get a random word through the dictionary API, so we get it through a different, free API
		const random_word_URL = `https://random-words-api.herokuapp.com/w?n=1`;
		let dictionary_url;
		let word = "";
		let gr_abbrev = "";//the abbreviation of the grammatical function of the word

		try {
			let key = await this.#data_base.getAPIKeys(1);
			//get the random word first for us to get access to the definition of it
			await fetch(random_word_URL).then(result => result.json()).then(body => {
				word = body[0];
				dictionary_url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${key}`;
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
					case "transitive verb":
						gr_abbrev = "trans. v";
						break;
					case "intransitive verb":
						gr_abbrev = "intr. v";
						break;
					case "noun":
						gr_abbrev = "n";
						break;
					case "noun phrase":
						gr_abbrev = "n&p";
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
						gr_abbrev = "tm";
						break;
					case "abbreviation":
						gr_abbrev = "abbrev";
						break;
					case "combining form":
						gr_abbrev = "comb. form";
						break;
					case "noun combining form":
						gr_abbrev = "n. comb. form";
						break;
					case "adjective combining form":
						gr_abbrev = "adj. comb. form";
						break;
					case "prefix":
						gr_abbrev = "pre";
						break;
					case "service mark":
						gr_abbrev = "serv. m";
						break;
					case "symbol":
						gr_abbrev = "sym";
						break;
					case "certification mark":
						gr_abbrev = "cert. m";
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
					case "adjective suffix":
						gr_abbrev = "adj. suf";
						break;
					case "adverb suffix":
						gr_abbrev = "adv. suf";
						break;
					case "noun suffix":
						gr_abbrev = "n. suf";
						break;
					case "verb suffix":
						gr_abbrev = "v. suf";
						break;
					case "verbal auxillary":
						gr_abbrev = "v. aux";
						break;
					case "verbal imperative":
						gr_abbrev = "v. imp";
						break;
					case "verb impersonal":
						gr_abbrev = "v. imper";
						break;
					default://need to see what pops out through here to get the abbreviaiton correct for this
						gr_abbrev == grammar_function;
						break;
				 }
				 this.client.say(target, `@${user.username}: ${word}: ${gr_abbrev}; ${definition}`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }
    }

	//gets the NASA Space image of the day and sends it out to the chat room as a URL
	//@param   target    The name of the chatroom we are posting the photo into
	async getNASAPicOfTheDay(target) {

		try {
			const url = `https://api.nasa.gov/planetary/apod?api_key=${await this.#data_base.getAPIKeys(3)}`;
	
			//we have gotten the space image URL at least once today
			if (this.#nasa_get != undefined) {
				const cur_date = new Date();
				if (cur_date.getTime() - this.#nasa_get.getTime() > 86400000) {//more than 24 hours have passed since the last call here
					await fetch(url).then(result => result.json()).then(body => {
						this.#space_url = body.hdurl;
					}).catch(err => {
						this.#generateAPIErrorResponse(err, target);
					});
				}
			} else {//we havent gotten the image yet as of launch, so get it immediately
				await fetch(url).then(result => result.json()).then(body => {
                    console.log(body);
					this.#space_url = body.hdurl;
				}).catch(err => {
					this.#generateAPIErrorResponse(err, target);
				});
			}
	
			//assuming that there was something to get, we send out the link
			if (this.#space_url != "") this.client.say(target, `Here is NASA's Space Photo of the Day! ${this.#space_url}`);
			else this.client.say(target, `Error retrieving NASA's Space Photo of the Day`);

		} catch (err) { console.error(err); }
		
	}

	//simple function that returns if the language of item is english
	//@param   item   The object we are looking at to determine its language
	//@return         True/False
	#isLangEn(item) { return item.language.name == "en" }

    //simple helper for generating an error so I don't have to type as much
	//@param   err      The error that has been generated
	//@param   target   The name of the chatroom we are posting to
	#generateAPIErrorResponse(err, target) {
		this.client.say(target, "Error: API currently not responding");
		console.error(err);
	}

}

export default MiscAPI;