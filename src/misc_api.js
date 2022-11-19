import fetch from 'node-fetch';
import Helper from './helper.js';
import fs from 'fs';

export class MiscAPI {

    #nasa_get;
	#space_url;
    #data_base

    //@param   c     The bot's Twitch client
	//@param   d_b   The bot's client for accessing its database
    constructor(d_b) {
        this.#data_base = d_b;
		this.helper = new Helper();
        this.#nasa_get = undefined;//date object; undefined until we get a call to the NASA API
		this.#space_url = "";
    }

    //prints out all current suggestions within suggestions.txt and sends it to chat
	//needs testing for format and looks
	async getAllCurrentSuggestions() {
		try {
			const data = fs.readFileSync('./data/suggestions.txt', 'utf8', (err) => {
				if (err) return 'Error in reading from file';
			});

			const lines = data.split(/\r?\n/);

			let msg = 'Top 5 suggestions for the bot are: ';

			for (let i = 0; i < 4; ++i) {
				msg += lines[i] + ', ';
			}
			msg += lines[4];

			return msg;
		} catch (err) {
			return 'Error in reading in suggestions from file';
		}
	}

	//gets and returns the list of games on the Epic Store that have been marked down as completely free
	//@param   target   The chat room we are posting the list into
	async getFreeGamesOnEpicStore() {
		//finally found the URL to get the list of games from this repo here: 
		//https://github.com/kjanuska/EpicFreeGames/blob/main/check_games.js
		const epic_url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

		//generic object that will hold the whole list of games returned by the URL
		let games_arr;

		//total count of games returned 
		let games_count;

		//list of all games that are available for free through the epic store
		let complete_discounted_games_list = [];

		try {

			await fetch(epic_url).then(result => result.json()).then(body => {
				//get the list of games and store them for safe keeping
			 	games_arr = body.data.Catalog.searchStore.elements;
			 	games_count = body.data.Catalog.searchStore.paging.total;
			}).catch( err => {
				return this.#generateAPIErrorResponse(err);
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
		if (complete_discounted_games_list.length == 0) return 'Sorry, no free games found at this time :(';

		//with all games found and inserted into the list, we can now compose our message
		let msg = 'The list of free games found on the Epic Games Store are: ';

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
		return msg;

	}

	//gets a random wikipedia article from the wikimedia API and delivers it to chat
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getRandWikipediaArticle() {

		const wiki_url = 'https://en.wikipedia.org/w/api.php?action=query&list=random&format=json&rnnamespace=0&rnlimit=1';

		let msg = '';

		await fetch(wiki_url).then(result => result.json()).then(body => {
			const page_title = body.query.random[0].title.replace(/ /g, "_");
			msg = `Here's a link to a random wikipedia page: https://en.wikipedia.org/wiki/${page_title}`;
		}).catch(err => {
			return this.#generateAPIErrorResponse(err);
		});

		return msg;

	}

	//Function that gathers data about the changes from this bot's GitHub repo and sends it to chat
	//@param   target   The chatroom that the message will be sent in to
	async getGithubRepoInfo() {
		const github_url = 'https://api.github.com/repos/meant-ion/TuringMod/commits';
		let current_repo_info, last_repo_info = undefined;//the URLS for the repos we need
		let current_repo_stats, last_repo_stats = undefined;//the info that the repos have

		//fetch the statistics we need from github via its web API
		await fetch(github_url).then(result => result.json()).then(body => {
			current_repo_info = body[0].url;
			last_repo_info = body[1].url;
		}).catch(err => {
			return this.#generateAPIErrorResponse(err);
		});

		await fetch(current_repo_info).then(result => result.json()).then(body => { current_repo_stats = body.stats; }).catch(err => {
			return this.#generateAPIErrorResponse(err);
		});

		await fetch(last_repo_info).then(result => result.json()).then(body => { last_repo_stats = body.stats; }).catch(err => {
			return this.#generateAPIErrorResponse(err);
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

		if (percentages_array[2] == 'Infinity' || percentages_array[2] == '-Infinity') percentages_array[2] = '0';

		//now we make the abomination of a message and send it out to the chatroom
		return `Current commit has ${current_array[0]} changes, ${indicators[0]} from last repo's ${last_array[0]} changes ` 
				+ `(${percentages_array[0]}% difference). ` +
				`Of the current total, ${current_array[1]} were additions (${indicators[1]} from last repo's ${last_array[1]} ` 
				+ `(${percentages_array[1]}% difference))` + 
				` and ${current_array[2]} were deletions (${indicators[2]} from last repo's ${last_array[2]} ` 
				+ `(${percentages_array[2]}% difference))`;
	}

	//gets the NASA Space image of the day and sends it out to the chat room as a URL
	//@param   target    The name of the chatroom we are posting the photo into
	async getNASAPicOfTheDay() {

		try {
			const url = `https://api.nasa.gov/planetary/apod?api_key=${await this.#data_base.getAPIKeys(3)}`;
	
			//we have gotten the space image URL at least once today
			if (this.#nasa_get != undefined) {
				const cur_date = new Date();
				if (cur_date.getTime() - this.#nasa_get.getTime() > 86400000) {//more than 24 hours have passed since the last call here
					await fetch(url).then(result => result.json()).then(body => {
						this.#space_url = body.hdurl;
					}).catch(err => {
						return this.#generateAPIErrorResponse(err);
					});
				}
			} else {//we havent gotten the image yet as of launch, so get it immediately
				await fetch(url).then(result => result.json()).then(body => this.#space_url = body.hdurl)
				.catch(err => {
					return this.#generateAPIErrorResponse(err);
				});
			}
	
			//assuming that there was something to get, we send out the link
			if (this.#space_url != "") return `Here is NASA's Space Photo of the Day! ${this.#space_url}`;
			else return `Error retrieving NASA's Space Photo of the Day`;

		} catch (err) { console.error(err); }
		
	}

    //simple helper for generating an error so I don't have to type as much
	//@param   err      The error that has been generated
	//@param   target   The name of the chatroom we are posting to
	#generateAPIErrorResponse(err) {
		console.error(err);
		return "Error:  requested API currently not responding";
	}

}

export default MiscAPI;