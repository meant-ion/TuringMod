import fetch from 'node-fetch';
import Helper from './helper.js';
import open from 'open';
import http from 'http';

export class TwitchAPI {

    #clip_list;
	#data_base;
    #twitch_token_get_time;

    //@param   c     The bot's Twitch client
	//@param   d_b   The bot's client for accessing its database
    constructor(c, d_b) {
        this.client = c;
        this.helper = new Helper();
        this.#data_base = d_b;
        this.#clip_list = [];
        this.#getTwitchToken();
    }

    //returns the length of time the asking user has been following the channel. Currently needs to be said in chat rather than in
	//a whisper, need to have the bot verified for that and need to make sure that all necessary parameters are met for it also
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getFollowAge(user, target) {
		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			let acct_found = false;
			let follow_url = 'https://api.twitch.tv/helix/users/follows?to_id=71631229';

			//go through the list of accounts, paging forward every 20 if we don't find what we want immediately
			while (!acct_found) {
				await fetch(follow_url, data).then(result => result.json())
				.then(body => {

					//loop through the list of followers to find the one that requested their follow age
					if (body.data != undefined) {
						for (let i = 0; i < body.data.length; ++i) 
							if (body.data[i].from_login == user.username) {//finally found the user following
								acct_found = true;
								let followedDate = new Date(body.data[i].followed_at);
								this.client.say(target, `@${user.username} has been following for: ` 
									+ `${this.helper.getTimePassed(followedDate, true)}`);
								break;
							}
	
						//not found yet, so set the cursor forward and remake request
						follow_url = 'https://api.twitch.tv/helix/users/follows?to_id=71631229' + `&after=${body.pagination.cursor}`;
					} else {
						this.client.say(target, `@${user.username}: You are currently not following this channel`);
						acct_found = true;//setting this to be true to avoid infinite loop
					}

				}).catch(err => {
					this.#generateAPIErrorResponse(err, target);
				});
			}

		} catch (err) { console.error(err); }

	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getChannelSchedule(user, target) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			await fetch('https://api.twitch.tv/helix/schedule?broadcaster_id=71631229&utc_offset=-300&first=6', data).then(result => result.json())
				.then(body => {
	
					let stream_dates = "";
					for (let i = 1; i < body.data.segments.length; ++i) {
						let curDate = new Date(body.data.segments[i].start_time);
						if (i + 1 == body.data.segments.length) stream_dates += curDate.toDateString();
						else stream_dates += curDate.toDateString() + ", ";
						
					}
					this.client.say(target, `@${user.username}: Streams for the next week starting today are on ${stream_dates}`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }

	}

	//gets and returns the total time the stream has been live. If channel isn't live, returns a message saying so
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getStreamUptime(user, target) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
				//check to see if the stream is live; if we don't, the app crashes hard and needs to be restarted
				if (body.data[0].started_at == undefined) {
					this.client.say(this.target, `@${user.username}: Stream is currently offline. Use !schedule to find out when` +
						" the next stream is. Thank you! :)");
				} else {
					let start_time = new Date(body.data[0].started_at);
					let time_msg = this.helper.getTimePassed(start_time, false);
					this.client.say(target, `@${user.username}: ${time_msg}`);
				}
				
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }
	}

	//gets and returns the title of the stream
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getStreamTitle(user, target) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
				this.client.say(target, `@${user.username} Title is: ${body.data[0].title}`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }

	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getUserAcctAge(user, target) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			const url = `https://api.twitch.tv/helix/users?login=${user.username}`;
	
			await fetch(url, data).then(result => result.json()).then(body => {
				let acct_create_date = new Date(body.data[0].created_at);
				let time_passed = this.helper.getTimePassed(acct_create_date, true);
				this.client.say(target, `@${user.username}, your account is ${time_passed} old`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }

	}

	//gets and returns the stream's category (what we are playing/doing for stream)
	//@param   client_id      The bot's Twitch ID, so we can get to the API easier
	//@param   user           The name of the chat member that typed in the command
	//@param   target         The chatroom that the message will be sent into
	async getCategory(user, target) {
		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
	
			await fetch(url, data).then(result => result.json()).then(body => {
				this.client.say(target, `@${user.username}: Current category is ${body.data[0].game_name}`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }

	}

	async getChannelSummary(user, target) {
		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			const url = "https://api.twitch.tv/helix/users?user_id=71631229";

			await fetch(url, data).then(result => result.json()).then(body => {
				this.client.say(target, `@${user.username}: ${body.data[0].description}`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});

		} catch (err) { console.error(err); }
	}

	//Gets info on a specific clip via its ID and sends that to a list of them
	//@param   clip_id        The ID of the potential clip we want to get info on
	async getClipInformation(clip_id) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			const url = "https://api.twitch.tv/helix/clips" + `?id=${clip_id}`;
	
			await fetch(url, data).then(result => result.json()).then(body => {
				if (body.data[0].url != undefined) this.#clip_list.push(`<a href="${body.data[0].url}">${body.data[0].url}</a>`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});
		} catch (err) { console.error(err); }

	}

	getClipList() { return this.#clip_list; }

	//edits the channel category/game to one specified by a moderator
	//@param   user           The name of the chat member that typed in the command
	//@param   game_name       The name of the category that we wish to change the stream over to
	async editChannelCategory(user, game_name, target) {

		try {
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();

			game_name = game_name.slice(1);
			game_name = game_name.replace(/&/g, "%26");
	
			//first, we need to get the category id to change the channel's category
			const game_id_URL = `https://api.twitch.tv/helix/games?name=` + `${game_name}`;
	
			let game_ID = "";
			let edit_channel_URL = "";
	
			await fetch(game_id_URL, data).then(result => result.json()).then(body => {
				game_ID = body.data[0].id;
				edit_channel_URL = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
				return;
			});

			//do it this way otherwise it runs too fast and just gives 401 errors b/c the client id becomes 'undefined'
			const c_id = await this.#data_base.getIdAndSecret();
			const cc_id = c_id[0];
	
			//secondary data structure is meant for the editing, since we have to use PATCH and not GET
			const edit_data = {
				'method': 'PATCH',
				'headers': {
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'Client-Id': `${cc_id}`,
					'Content-Type': 'application/json'
				},
				'body': JSON.stringify({
					"game_id": game_ID,
				}),
			};
	
			//send out the info and edit the channel's category
			await fetch(edit_channel_URL, edit_data).then(() => {
				this.client.say(target, `@${user.username}: Category Successfully Updated`);
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});	

		} catch (err) { console.error(err); }

	}

	//edits the stream's title to one requested by streamer/moderator
	//@param   title          The title we wish to now use on the stream
	//@param   target         The channel who's title we wish to change
	async editStreamTitle(title, target) {

		if (title.length == 0 || title == " ") {//catch if the title is empty and prevent it from passing through
			this.client.say(target, "Cant change stream title to empty title");
		} else {
			try {
				this.#hasTokenExpired(true);
				const url  =`https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

				//do it this way otherwise it runs too fast and just gives 401 errors b/c the client id becomes 'undefined'
				const c_id = await this.#data_base.getIdAndSecret();
				const cc_id = c_id[0];
	
				//nothing fancy like editing the category, we just make the header and use the provided title for updating
				const edit_data = {
					'method': 'PATCH',
					'headers': {
						'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
						'Client-Id': `${cc_id}`,
						'Content-Type': 'application/json'
					},
					'body': JSON.stringify({
						'title': title
					}),
				};
		
				//send out the request and tell if there's been an issue on their end
				await fetch(url, edit_data).then((res) => {
					this.client.say(target, `${(res.status == 204) ? `Title successfully updated!` : `Error, could not change title`}`)
				}).catch(err => {
					this.#generateAPIErrorResponse(err, target);
				});
			} catch (err) { console.error(err); }
		}


	}

	//grabs a list of all members in the chatroom currently and times random ones out for a short time
	//to be seriously used when there is enough people to actually use it on
	//@param   target         The chatroom that the message will be sent into
	async shotgunTheChat(target) {

		try {
			this.#hasTokenExpired(true);
			const url = `https://tmi.twitch.tv/group/user/pope_pontus/chatters`;

			const data = await this.#createTwitchDataHeader();
	
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
		} catch (err) { console.error(err); }
	}

	//simple little function that will get a rough guess of whether or not the channel is a victim of view botting
	//@param   target   The channel we are posting the message to
	async getChancesStreamIsViewbotted(target) {
		//get our URLs and counts set up here
		const chatroom_url = `https://tmi.twitch.tv/group/user/pope_pontus/chatters`;
		const helix_url = 'https://api.twitch.tv/helix/users?id=71631229';
		let chatroom_member_count, viewer_count;

		try {
			this.#hasTokenExpired(true);

			//get the necessary headers, and send out the fetch requests
			const chatroom_data = await this.#createTwitchDataHeader();
			const helix_data = await this.#createTwitchDataHeader();

			//get # of viewers watching the stream
			await fetch(helix_url, helix_data).then(result => result.data()).then(body => {
				viewer_count = body[0].viewer_count;
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});

			//get # of poeple in the chatroom currently
			await fetch(chatroom_url, chatroom_data).then(result => result.json()).then(body => {
				chatroom_member_count = body.chatters.viewers.length;
			}).catch(err => {
				this.#generateAPIErrorResponse(err, target);
			});

			//if any one of the gathered values is zero, we send a msg and exit this function
			if (chatroom_member_count <= 0 || viewer_count <= 0) {
				this.client.say(target, "Cannot get that statistic due to divide by zero error");
				return;
			}

			//get the ratio and then tell the chatroom what the verdict is
			const viewers_to_chat_ratio = (chatroom_member_count / viewer_count) * 100.0;

			//arbitrarily chose 35% as the cutoff ratio to tell if there's viewbotting
			//no real reason behind this being the cutoff, just seemed like a good place to leave it at
			const msg = `Ratio of viewers to chatroom members is ${viewers_to_chat_ratio}` + 
				`${(viewers_to_chat_ratio < 35.0) ? `; This looks like a viewbotting issue to me :(` : `; This doesn't look like viewbotting to me at all :)`}`;

			this.client.say(target, msg);

		} catch (err) { console.error(err); }
	}

	//returns stream uptime for use in ad warning system
	//@return    The uptime of the stream in seconds
	async getUneditedStreamUptime() {
		try {
			
			this.#hasTokenExpired(true);
			const data = await this.#createTwitchDataHeader();
			let time = 0;

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
                if (body.data[0].started_at == undefined) time = NaN;
				else time = ((new Date()).getTime() - (new Date(body.data[0].started_at)).getTime()) / 1000;

			}).catch(err => this.#generateAPIErrorResponse(err, "#pope_pontus"));

			return time;

		} catch (err) { console.error(err); }
	}

    //creates a PubSub subscription of the topic deigned by the user
	//@param   topic             The topic we wish to listen to
	//@param   commands_holder   The database manipulation object so we can get the oauth token
	//@param   pubsubs           The PubSub object
	async makePubSubscription(topic, pubsubs) {
		const tkn = await this.#data_base.getTwitchInfo(0);
		pubsubs.requestToListen(topic, tkn);
	}

	//edits the channel's chatroom settings as requested by a user. This is used within pubsub_handler.js
	//@param   settings   array of settings the user wants to change
	//@param   username   the user requesting the change
	async editChatroomSettings(settings, username) {
		//need to get the bot's user id so we can make the request go through

		let bot_id = "";
		let req_failed = false;
		this.#hasTokenExpired(true);
		const data = await this.#createTwitchDataHeader();

		const id_url = "https://api.twitch.tv/helix/users?login=saint_isidore_bot";

		await fetch(id_url, data).then(result => result.json()).then(body => {
			console.log(body.data[0]);
			bot_id = body.data[0].id;
		}).catch(err => {
			this.#generateAPIErrorResponse(err, "#pope_pontus");
			req_failed = true;
		});

		if (req_failed) return;

		//with the id in hand, we get the current settings for the chatroom and see what needs to change
		const get_settings_url = `https://api.twitch.tv/helix/chat/settings?broadcaster_id=71631229`;

		let cur_chat_settings;

		await fetch(get_settings_url, data).then(result => result.json()).then(body => {
			cur_chat_settings = body.data[0];
		}).catch(err => {
			this.#generateAPIErrorResponse(err, "#pope_pontus");
			req_failed = true;
		});

		if (req_failed) return;

		//now we get to check each of the 5 categories we want chat to be able to change,

		let body_obj = {};

		for(let i = 0; i < settings.length; ++i) {
			switch (settings[i].toLowerCase()) {
				case "slow-mode":
					body_obj["slow_mode"] = !cur_chat_settings["slow_mode"];
					body_obj["slow_mode_wait_time"] = cur_chat_settings["slow_mode"] ? null : 10;
					break;
				case "follower-only":
					body_obj["follower_mode"] = !cur_chat_settings["follower_mode"];
					body_obj["follow_mode_duration"] = cur_chat_settings["follower_mode"] ? null : 1;
					break; 
				case "subscriber-only":
					body_obj["subscriber_mode"] = !cur_chat_settings["subscriber_mode"];
					break;
				case "emote-only":
					body_obj["emote_mode"] = !cur_chat_settings["emote_mode"];
					break;
				case "unique":
					body_obj["unique_chat_mode"] = !cur_chat_settings["unique_chat_mode"];
					break;
			}
		}

		console.log(body_obj);

		//with body made, we will now put through the request
		let cc_id = await this.#data_base.getTwitchSessionInfo();

		const set_settings_url = get_settings_url + `&moderator_id=${bot_id}`;

		const edit_data = {
			'method': 'PATCH',
			'headers': {
				'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
				'Client-Id': `${cc_id[0]}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify(body_obj),
		};

		await fetch(set_settings_url, edit_data).then(result => result.json()).then(body => {
			console.log(body);
			this.client.say("#pope_pontus", `@${username}: ${body.data[0] != undefined ? "Settings Updated!" : "Error in updating settings"}`);
		}).catch(err => this.#generateAPIErrorResponse(err, "#pope_pontus"));
		
	}

    //-------------------------------------PRIVATE MEMBER FUNCTIONS------------------------------------------------

    //gets a token for the Helix API that will let me edit my own channel's info (title, tags, category, etc.)
	async #getTwitchToken() {

		try {
			//get all necessary data from the DB and go from there
			let session_info = await this.#data_base.getTwitchSessionInfo();

			//all necessary vars needed to get the auth token so we can get the request token
			let post_data = {
				'method': 'POST'
			};
			let url = `https://id.twitch.tv/oauth2/authorize?client_id=${session_info[0]}&redirect_uri=${session_info[3]}&response_type=code&scope=${session_info[2]}&state=${session_info[4]}`;

			let code, post_url;

			//first, we get the auth code to get the request token via getting a server up and running
			let s = http.createServer((req, res) => {
				let u = new URL(req.url, "http://localhost:3000");
				if (u.searchParams.get('code') != null) {
					code = u.searchParams.get('code');
				}
				post_url = `https://id.twitch.tv/oauth2/token?client_id=${session_info[0]}&client_secret=${session_info[1]}&code=${code}&grant_type=authorization_code&redirect_uri=${session_info[3]}`;
				res.end();
			}).listen(3000);

			//open up the page to get access to the auth code
			await open(url, {wait:true}).then(console.log("* Page opened"));

			//with the auth code now gotten, send a request to Helix to get the JSON object holding the codes we need
			await fetch(post_url, post_data).then(result => result.json()).then(body => {
				this.#data_base.writeTwitchTokensToDB(body.access_token, body.refresh_token);
				this.#twitch_token_get_time = new Date();//get the time the token was made too, for refresh purposes
				console.log("* Full OAuth Access Token to Helix API Accquired");
			}).catch(err => {
				this.#generateAPIErrorResponse(err, "pope_pontus");
			});

			s.close();
		} catch (err) { console.error(err); }

    }

	//When called (i.e. when an API call fails or every 2 hours or so while active) it will query the Helix API and get us a new access token when needed
	async #refreshTwitchTokens() {
		//standard data object so the API knows we're refreshing the token we got
		let data = {
			'method': 'POST'
	   	};

		//from the DB object passed into the class, we grab the refresh token we're gonna need for this to work
		let refresh_token = await this.#data_base.getTwitchInfo(1);

		//get the client secret and all that fun stuff so we can make the proper request
		let client_stuff = await this.#data_base.getIdAndSecret();

		const encodedTok = encodeURIComponent(refresh_token);

		let url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${encodedTok}&client_id=${client_stuff[0]}&client_secret=${client_stuff[1]}`;
		
		//send the request and write the tokens to the DB for safe keeping
		await fetch(url, data).then(result => result.text()).then(body => {
			if (body.status == null) {
			 	this.#data_base.writeTwitchTokensToDB(body.access_token, body.refresh_token);
				this.#twitch_token_get_time = new Date();//get the time the token was made too, for refresh purposes
			}
		});
	}

    //simple helper function for setting up a basic Helix API header using provided values
	//made so I have to do less typing/make less redundant code
	//@returns                A header object in the correct format for accessing the Helix API
	async #createTwitchDataHeader() {
		let s = await this.#data_base.getIdAndSecret();
		return {
			'method': 'GET',
			'headers': {
				'client-id': `${s[0]}`,
				'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`
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

    //simple helper to tell us if the token is expired for one of our two main APIs
	//@param   which_token   Bool that tells if we need to check the Twitch or Spotify tokens
	#hasTokenExpired(which_token) {

		//get the difference between the time the token was accquired and right now at this call
		let cur_time = new Date();
		//make sure to get the correct token here
		let token_time = this.#twitch_token_get_time; 
		const diff = (cur_time.getTime() - token_time.getTime()) / 1000;

		//if we have a large enough difference between the two times, refresh the specified token
		if (diff >= 3600) this.#refreshTwitchTokens();
	}

}

export default TwitchAPI;