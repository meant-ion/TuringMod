import fetch from 'node-fetch';
import Helper from './helper.js';
import open from 'open';
import http from 'http';
import fs from 'fs';

export class TwitchAPI {

    #clip_list;
	#data_base;
    #twitch_token_get_time;

	//@param   d_b   The bot's client for accessing its database
    constructor(d_b) {
        this.helper = new Helper();
        this.#data_base = d_b;
        this.#clip_list = [];
        this.#getTwitchToken();
    }

    //returns the length of time the asking user has been following the channel. Currently needs to be said in chat rather than in
	//a whisper, need to have the bot verified for that and need to make sure that all necessary parameters are met for it also
	//@param   user           The name of the chat member that typed in the command
	async getFollowAge(user) {
		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			let msg = '';

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
								msg = `has been following for: ${this.helper.getTimePassed(followedDate, true)}`;
								break;
							}
	
						//not found yet, so set the cursor forward and remake request
						follow_url = 'https://api.twitch.tv/helix/users/follows?to_id=71631229' + 
							`&after=${body.pagination.cursor}`;
					} else {
						msg = 'You are currently not following this channel';
						acct_found = true;//setting this to be true to avoid infinite loop
					}

				}).catch(err => { return this.#generateAPIErrorResponse(err); });
			}
			return msg;

		} catch (err) { console.error(err); }

	}

	//gets and returns the stream schedule for the week starting after the current stream in a human-readable format
	async getChannelSchedule() {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			let msg = '';

			await fetch('https://api.twitch.tv/helix/schedule?broadcaster_id=71631229&utc_offset=-300&first=6', data).then(result => result.json())
				.then(body => {
	
					let stream_dates = "";
					for (let i = 1; i < body.data.segments.length; ++i) {
						let curDate = new Date(body.data.segments[i].start_time);
						if (i + 1 == body.data.segments.length) stream_dates += curDate.toDateString();
						else stream_dates += curDate.toDateString() + ", ";	
					}
					msg = `Streams for the next week starting today are on ${stream_dates}`;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { console.error(err); }

	}

	//gets and returns the total time the stream has been live. If channel isn't live, returns a message saying so
	async getStreamUptime() {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			let msg = '';

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
				//check to see if the stream is live; if we don't, the app crashes hard and needs to be restarted
				if (body.data[0].started_at == undefined) {
					msg = "Stream is currently offline. Use !schedule to find out when the next stream is. Thank you! :)";
				} else {
					const start_time = new Date(body.data[0].started_at);
					msg = this.helper.getTimePassed(start_time, false);
				}
				
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { console.error(err); }
	}

	//gets and returns the title of the stream
	async getStreamTitle() {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			let msg = '';

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
				msg = `Title is: ${body.data[0].title}`;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { console.error(err); }

	}

	//gets an account's creation date, calculates its age, and then returns it to the chatroom
	//@param   user     The name of the chat member that typed in the command
	async getUserAcctAge(user) {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			const url = `https://api.twitch.tv/helix/users?login=${user.username}`;

			let msg = '';
	
			await fetch(url, data).then(result => result.json()).then(body => {
				const acct_create_date = new Date(body.data[0].created_at);
				const time_passed = this.helper.getTimePassed(acct_create_date, true);
				msg = `your account is ${time_passed} old`
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { console.error(err); }

	}

	//gets and returns the stream's category (what we are playing/doing for stream)
	async getCategory() {
		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			const url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

			let msg = '';
	
			await fetch(url, data).then(result => result.json()).then(body => {
				msg = `Current category is ${body.data[0].game_name}`;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { console.error(err); }
	}

	//gets and returns the streamer's channel summary
	async getChannelSummary() {
		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			const url = "https://api.twitch.tv/helix/users?user_id=71631229";

			let msg = '';

			await fetch(url, data).then(result => result.json()).then(body => {
				msg = body.data[0].description;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;

		} catch (err) { console.error(err); }
	}

	//Gets info on a specific clip via its ID and sends that to a list of them
	//@param   clip_id        The ID of the potential clip we want to get info on
	async getClipInformation(clip_id) {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			const url = `https://api.twitch.tv/helix/clips?id=${clip_id}`;
	
			await fetch(url, data).then(result => result.json()).then(body => {
				if (body.data[0].url != undefined) this.#clip_list.push(`<a href="${body.data[0].url}">${body.data[0].url}</a>`);
			}).catch(err => { return this.#generateAPIErrorResponse(err); });
		} catch (err) { console.error(err); }

	}

	getClipList() { return this.#clip_list; }

	//edits the channel category/game to one specified by a moderator
	//@param   game_name       The name of the category that we wish to change the stream over to
	async editChannelCategory(game_name) {

		try {
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			let msg = '';

			game_name = game_name.slice(1);
			game_name = game_name.replace(/&/g, "%26");
	
			//first, we need to get the category id to change the channel's category
			const game_id_URL = `https://api.twitch.tv/helix/games?name=` + `${game_name}`;
	
			let game_ID = "";
			let edit_channel_URL = "";
	
			await fetch(game_id_URL, data).then(result => result.json()).then(body => {
				game_ID = body.data[0].id;
				edit_channel_URL = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
			}).catch(err => { return this.#generateAPIErrorResponse(err); } );

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
				msg = 'Category Successfully Updated';
			}).catch(err => {
				msg = 'Bad Category Name';
				return this.#generateAPIErrorResponse(err);
			});	

			return msg;

		} catch (err) { console.error(err); }

	}

	//edits the stream's title to one requested by streamer/moderator
	//@param   title          The title we wish to now use on the stream
	async editStreamTitle(title) {

		if (title.length == 0 || title == " ") {//catch if the title is empty and prevent it from passing through
			//this.client.say(target, "Cant change stream title to empty title");
			return "Can't change stream title to empty string";
		} else {
			try {
				this.#hasTokenExpired();
				const url  =`https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;

				let msg = '';

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
					msg = (res.status == 204) ? `Title successfully updated!` : `Error, could not change title`;
				}).catch(err => { return this.#generateAPIErrorResponse(err); });

				return msg;
			} catch (err) { console.error(err); }
		}
	}

	//grabs a list of all members in the chatroom currently and times random ones out for a short time
	//to be seriously used when there is enough people to actually use it on
	//@param   target         The chatroom that the message will be sent into
	async shotgunTheChat() {

		try {
			this.#hasTokenExpired();
			const url = `https://tmi.twitch.tv/group/user/pope_pontius/chatters`;

			const data = await this.#createTwitchDataHeader();

			let client_msg = [];
			client_msg.push("Uh oh, someone fired the banhammer off again!");
	
			//get the number of people hit by the shotgun "pellets"
			const victims = Math.floor(Math.random() * 5) + 1;

			let victim_list;
	
			//now get the list of "victims" and choose, at random, who gets hit
			await fetch(url, data).then(result => result.json()).then(body => {
				const list = body.chatters.viewers;
				console.log(body.chatters.viewers);
	
				//with the list gathered, loop through each time and time out the member all at once
				for (i = 0; i < victims; ++i) {
					let victim_index = Math.floor(Math.random() * list.length);

					victim_list.push(list[victim_index]);
				}
				client_msg.push(victim_list);
			}).catch(err => { return this.#generateAPIErrorResponse(err); });
			return client_msg;
		} catch (err) { console.error(err); }
	}

	//simple little function that will get a rough guess of whether or not the channel is a victim of view botting
	async getChancesStreamIsViewbotted() {
		//get our URLs and counts set up here
		const chatroom_url = `https://tmi.twitch.tv/group/user/pope_pontius/chatters`;
		const helix_url = 'https://api.twitch.tv/helix/users?id=71631229';
		let chatroom_member_count, viewer_count;

		try {
			this.#hasTokenExpired();

			//get the necessary headers, and send out the fetch requests
			const chatroom_data = await this.#createTwitchDataHeader();
			const helix_data = await this.#createTwitchDataHeader();

			//get # of viewers watching the stream
			await fetch(helix_url, helix_data).then(result => result.data()).then(body => {
				viewer_count = body[0].viewer_count;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			//get # of poeple in the chatroom currently
			await fetch(chatroom_url, chatroom_data).then(result => result.json()).then(body => {
				chatroom_member_count = body.chatters.viewers.length;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			//if any one of the gathered values is zero, we send a msg and exit this function
			if (chatroom_member_count <= 0 || viewer_count <= 0) 
				//this.client.say(target, "Cannot get that statistic due to divide by zero error");
				return "Cannot get that statistic due to divide by zero error";

			//get the ratio and then tell the chatroom what the verdict is
			const viewers_to_chat_ratio = (chatroom_member_count / viewer_count) * 100.0;

			//arbitrarily chose 35% as the cutoff ratio to tell if there's viewbotting
			//no real reason behind this being the cutoff, just seemed like a good place to leave it at
			const msg = `Ratio of viewers to chatroom members is ${viewers_to_chat_ratio}` + 
				`${(viewers_to_chat_ratio < 35.0) ? `; This looks like a viewbotting issue to me :(` : `; This doesn't look like viewbotting to me at all :)`}`;

			//this.client.say(target, msg);
			return msg;

		} catch (err) { console.error(err); }
	}

	//returns stream uptime for use in ad warning system
	//@return    The uptime of the stream in seconds
	async getUneditedStreamUptime() {
		try {
			
			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();
			let time = 0;

			await fetch('https://api.twitch.tv/helix/streams?user_id=71631229', data).then(result => result.json()).then(body => {
                if (body.data[0].started_at == undefined) time = NaN;
				else time = ((new Date()).getTime() - (new Date(body.data[0].started_at)).getTime()) / 1000;

			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return time;

		} catch (err) { console.error(err); }
	}

    //creates a PubSub subscription of the topic deigned by the user
	//@param   topic             The topic we wish to listen to
	//@param   pubsubs           The PubSub object
	async makePubSubscription(topic, pubsubs) {
		const tkn = await this.#data_base.getTwitchInfo(0);
		pubsubs.requestToListen(topic, tkn);
	}

	//edits the channel's chatroom settings as requested by a user. This is used within pubsub_handler.js
	//@param   settings   array of settings the user wants to change
	async editChatroomSettings(settings) {
		//need to get the bot's user id so we can make the request go through

		this.#hasTokenExpired();
		const data = await this.#createTwitchDataHeader();

		//with the id in hand, we get the current settings for the chatroom and see what needs to change
		const settings_url = `https://api.twitch.tv/helix/chat/settings?broadcaster_id=71631229&moderator_id=71631229`;

		let cur_chat_settings;

		await fetch(settings_url, data).then(result => result.json()).then(body => {
			cur_chat_settings = body.data[0];
		}).catch(err => {
			return this.#generateAPIErrorResponse(err);
		});

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

		//with body made, we will now put through the request
		let cc_id = await this.#data_base.getTwitchSessionInfo();

		const edit_data = {
			'method': 'PATCH',
			'headers': {
				'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
				'Client-Id': `${cc_id[0]}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify(body_obj),
		};

		let msg = '';

		await fetch(settings_url, edit_data).then(result => result.json()).then(body => {
			msg = body.data[0] != undefined ? "Settings Updated!" : "Error in updating settings";
		}).catch(err => { return this.#generateAPIErrorResponse(err); });
		return msg;
		
	}

	//gets and returns the list of tags currently applied to the stream
	async getStreamTags() {
		const tags_url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=71631229`;
		let msg = "Tags for this stream are ";

		try {

			this.#hasTokenExpired();

			const data = await this.#createTwitchDataHeader();

			//get the list of tags from the stream
			await fetch(tags_url, data).then(result => result.json()).then(body => {
				for (let i = 0; i < body.data.length; ++i) {
					let tag = body.data[i];
					//add each tag in grammatically correct to the response msg
					if (i + 1 >= body.data.length) 
						msg += ` and ${tag.localization_names['en-us']}`;
					else 
						msg += `${tag.localization_names['en-us']}, `;
				}
			}).catch(err => { return this.#generateAPIErrorResponse(err); });
			return msg;
		} catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	//changes the tags of the stream to new ones. Cannot change automatic tags at all
	//@param   list_of_tags   The list of tags we want to have be present in the stream 
	async replaceStreamTags(list_of_tags) {

		this.#getAndUpdateTagsList("#pope_pontius");
		const tags_list = JSON.parse(fs.readFileSync('./data/tags_list.json', {encoding: 'utf8'}));

		const tags_url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=71631229`;
		//first, read in the contents of the tags list file to memory so we can search it easier

		//list of tags to add to the channel must be an array
		let tags_array = [];

		//using the list of available tags, we search for them 
		for (let i = 0; i < list_of_tags.length; ++i) {
			let tag = list_of_tags[i];
			//multi-word tags exist, so if we cannot find the tag first, we go through the list and see if combos
			//of tags in the list fit together
			if (tags_list[tag] == undefined) {
				let orig_tag = tag;
				let tag_found = false;
				//go through the rest of the tag list and see if the words combined with each other make a valid tag
				for (let j = i + 1; j < list_of_tags.length; ++j) {
					tag += ` ${list_of_tags[j]}`;
					if (tags_list[tag] != undefined) {
						tags_array.push(tags_list[tag]);
						i = j;
						tag_found = true;
						j = list_of_tags.length;
					}
				}
				tag = orig_tag;
				// tag is not found, so we make a custom tag. 
				// main rule for custom tags: no more than 25 characters in size
				if (!tag_found) {
					//combine the list of tags until we reach the 25 char limit
					for (let j = i + 1; j < list_of_tags.length; ++j) {
						const wombo_combo = tag + list_of_tags[j];
						if (wombo_combo.length > 25) {
							tags_array.push(wombo_combo);
							j = list_of_tags.length;
						}
						tag = wombo_combo;
					}
				}
				// if (!tag_found) return `Error with unsupported tag ${orig_tag}`;
			} else {
				tags_array.push(tags_list[tag]);
			}
		}
		//Twitch only allows for 5 tags to be input by the streamer at a time. Any more and it wont go through
		//if more than 5 tags, reject them and put out message saying so
		if (tags_array.length > 10)
			return 'Too many tags provided. Max 10';

		//with tags assembled, we send out the request 
		try {
			const s = await this.#data_base.getIdAndSecret();
			const data = {
				'method': 'PUT',
				'headers': {
					'client-id': `${s[0]}`,
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'Content-Type': 'application/json'
				},
				'body': JSON.stringify({
					'tag_ids': tags_array
				})
			};

			let msg = '';

			await fetch(tags_url, data)
			.then(msg = 'Tags Edited Successfully')
			.catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;
		} catch (err) { return this.#generateAPIErrorResponse(err); }

	}

	//gets the current, most recent creator goal and sends it out to the stream
	//TODO when bigger: make this work for multiple goals 
	//(I doubt I will have > 1 active at a time, but it'd be interesting to handle anyway)
	async getCreatorGoals() {
		const goals_url = 'https://api.twitch.tv/helix/goals?broadcaster_id=71631229';

		const data = this.#createTwitchDataHeader();

		await fetch(goals_url, data).then(result => result.json()).then(body => {
			const response = body.data[0];

			let msg;

			//if we dont have anything in the type of goal, we have no goal. So we dont check the others
			if (response.type == undefined) 
				msg = "There are currently no creator goals for this channel";
			else 
				msg = `Current goal is for ${response.type}; Currently have ${response.current_amount} / ${response.target_amount}`;
			

			return msg
		}).catch(err => { return this.#generateAPIErrorResponse(err); });
	}

	//deletes the last vod on the channel. Useful if something against Twitch's TOS happens accidentally and I 
	//need to try to prevent my own ban from it
	async deleteLastVOD() {
		//Part 1: We get the id of the last vod

		//we only want the last vod for the channel, so we set the type of vod to uploads and set 
		//the number returned to 1
		const vod_url = 'https://api.twitch.tv/helix/videos?user_id=71631229&first=1&type=upload';

		const data = this.#createTwitchDataHeader();

		let vod_id = "-1";

		//get the id of the vod now. If we get back a bad result, then we send an error message and return
		await fetch(vod_url, data).then(result => result.json()).then(body => {
			if (body.data[0].id != undefined) 
				vod_id = body.data[0].id;
		}).catch(err => { return this.#generateAPIErrorResponse(err); });

		if (vod_id == "-1")
			return "Error in fetching VOD ID of last published vod";

		//Part 2: We delete the vod

		const delete_vod_url = `https://api.twitch.tv/helix/videos?id=${vod_id}`;

		try {
			const s = await this.#data_base.getIdAndSecret();
			const data = {
				'method': 'DELETE',
				'headers': {
					'client-id': `${s[0]}`,
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`
				},
			}

			let msg = '';

			await fetch(delete_vod_url, data).then(() => msg = "VOD successfully deleted");

			return msg;

		} catch (err) { return this.#generateAPIErrorResponse(err); }

	}

	//If I ever go on a moderator hunting spree, this function will restore the moderators their priveliges
	async fixModBanGoofs() {

		let mod_arr = [];
		fs.readFile('./data/modlist.txt', (err, data) => {
			if(err) console.error(err);
			mod_arr = data.toString().split('\r\n');
		});

		const get_mods_url = 'https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=71631229';

		const data = await this.#createTwitchDataHeader();

		let curr_mod_arr = [];

		await fetch(get_mods_url, data).then(result => result.json()).then(body => {
			for (let i = 0; i < body.data.length; ++i) curr_mod_arr.push(body.data[i].user_id);
		});

		console.log(curr_mod_arr);

		let add_data = await this.#createTwitchDataHeader();
		const b_id = add_data.headers['client-id'];
		add_data.method = 'POST';

		console.log(mod_arr);

		for (let i = 0; i < mod_arr; ++i) {
			console.log(mod_arr[i]);
			if (!curr_mod_arr.includes(mod_arr[i])) {
				console.log(mod_arr[i]);
				let mod_add_url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${b_id}&user_id=${mod_arr[i]}`;
				await fetch(mod_add_url, add_data).then((res) => {
					if (!res.ok) {
						console.log(res.status);
						console.log('Error adding in moderator ' + mod);
					}
				});
			}
		}

	}

    //-------------------------------------PRIVATE MEMBER FUNCTIONS------------------------------------------------

	//gathers the list of tags that Twitch provides
	//definitly gonna be worked on better later in time tho
	async #getAndUpdateTagsList() {
		//get the first 100 tags of the total list of tags
		let tags_url =  "https://api.twitch.tv/helix/tags/streams?first=100";
		let pagination_target = '';
		let tags_list = {};//object that we will write to file with all the wanted tags in

		try {

			const data = await this.#createTwitchDataHeader();
			
			//we repeatedly call the API to get all relevant tags
			while(pagination_target != undefined) {
				await fetch(tags_url, data).then(result => result.json()).then(body => {

					//get the pagination object first, as we need that to get the rest of the tags
					pagination_target = body.pagination.cursor;
	
					//with the cursor got, we iterate through the list of tags
					//getting the name and the id where the tags are not automatically applied
					for (let i = 0; i < body.data.length; ++i) {
						let tag = body.data[i];
						if (tag.is_auto == false) {
							tags_list[tag.localization_names['en-us']] = tag.tag_id;
						}
					}

					//update the url with the pagination cursor for repeated calls to the API
					tags_url = `https://api.twitch.tv/helix/tags/streams?first=100&after=${pagination_target}`;
	
				}).catch(err => { return this.#generateAPIErrorResponse(err) });
			}

			//with all relevant tags got, write the list of them to file
			fs.writeFile('./data/tags_list.json', JSON.stringify(tags_list), 'utf8', err => {
				if (err) console.error(err);
			});

		} catch (err) { console.error(err); }

	}

    //gets a token for the Helix API that will let me edit my own channel's info (title, tags, category, etc.)
	async #getTwitchToken() {

		try {
			//get all necessary data from the DB and go from there
			const session_info = await this.#data_base.getTwitchSessionInfo();

			//all necessary vars needed to get the auth token so we can get the request token
			const post_data = {
				'method': 'POST'
			};
			const url = `https://id.twitch.tv/oauth2/authorize?client_id=${session_info[0]}&redirect_uri=${session_info[3]}&response_type=code&scope=${session_info[2]}&state=${session_info[4]}`;

			let code, post_url;

			//first, we get the auth code to get the request token via getting a server up and running
			let s = http.createServer((req, res) => {
				const u = new URL(req.url, "http://localhost:3000");
				if (u.searchParams.get('code') != null) code = u.searchParams.get('code');
				post_url = `https://id.twitch.tv/oauth2/token?client_id=${session_info[0]}&client_secret=${session_info[1]}&code=${code}&grant_type=authorization_code&redirect_uri=${session_info[3]}`;
				res.end();
			}).listen(3000);

			//open up the page to get access to the auth code
			await open(url, {wait:true}).then(console.log("* Twitch API Page opened"));

			//with the auth code now gotten, send a request to Helix to get the JSON object holding the codes we need
			await fetch(post_url, post_data).then(result => result.json()).then(body => {
				this.#data_base.writeTwitchTokensToDB(body.access_token, body.refresh_token);
				this.#twitch_token_get_time = new Date();//get the time the token was made too, for refresh purposes
				console.log("* Full OAuth Access Token to Helix API Accquired");
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			s.close();
		} catch (err) { console.error(err); }

    }

	//When called (i.e. when an API call fails or every 2 hours or so while active) it will query the Helix API and get us a new access token when needed
	async #refreshTwitchTokens() {
		//standard data object so the API knows we're refreshing the token we got
		const data = {
			'method': 'POST'
	   	};

		//from the DB object passed into the class, we grab the refresh token we're gonna need for this to work
		const refresh_token = await this.#data_base.getTwitchInfo(1);

		//get the client secret and all that fun stuff so we can make the proper request
		const client_stuff = await this.#data_base.getIdAndSecret();

		const encodedTok = encodeURIComponent(refresh_token);

		const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${encodedTok}&client_id=${client_stuff[0]}&client_secret=${client_stuff[1]}`;
		
		//send the request and write the tokens to the DB for safe keeping
		await fetch(url, data).then(result => result.json()).then(body => {
			if (body.status == null) {
			 	this.#data_base.writeTwitchTokensToDB(body.access_token, body.refresh_token);
				this.#twitch_token_get_time = new Date();//get the time the token was made too, for refresh purposes
			}
		}).catch(err => { return this.#generateAPIErrorResponse(err) });;
	}

    //simple helper function for setting up a basic Helix API header using provided values
	//made so I have to do less typing/make less redundant code
	//@returns                A header object in the correct format for accessing the Helix API
	async #createTwitchDataHeader() {
		const s = await this.#data_base.getIdAndSecret();
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
	#generateAPIErrorResponse(err) {
		console.error(err);
		return 'Error: Twitch API currently not responding';
	}

    //simple helper to tell us if the token is expired for one of our two main APIs
	//@param   which_token   Bool that tells if we need to check the Twitch or Spotify tokens
	#hasTokenExpired() {
		
		//get the difference between the time the token was accquired and right now at this call
		try {
			const cur_time = new Date();
			//make sure to get the correct token here
			const token_time = this.#twitch_token_get_time; 
			const diff = (cur_time.getTime() - token_time.getTime()) / 1000;
	
			//if we have a large enough difference between the two times, refresh the specified token
			if (diff >= 3600) this.#refreshTwitchTokens();
		} catch (err) {
			console.error(err);
			console.log('Error with refreshing tokens for twitch api, most likely due to issue with connection to API');
		}
	}

}

export default TwitchAPI;