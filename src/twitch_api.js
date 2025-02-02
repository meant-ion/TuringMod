import fetch from 'node-fetch';
import Helper from './helper.js';
import open, {apps} from 'open';
import http from 'http';

export class TwitchAPI {

    #clip_list;
	#data_base;
    #twitch_token_get_time;
	#shoutout_queue;
	#currently_shouting;

	//@param   d_b   The bot's client for accessing its database
    constructor(d_b) {
        this.helper = new Helper();
        this.#data_base = d_b;
        this.#clip_list = [];
		this.#shoutout_queue = [];
		this.#currently_shouting = false;
        this.#getTwitchToken();
    }

	async sendChatMessage(message) {
		try {
			this.#hasTokenExpired();
			let data = await this.#createTwitchDataHeader();
			data.method = 'POST';

			let chat_url = 'https://api.twitch.tv/helix/chat/messages?broadcaster_id=7163229';
		} catch (err) { console.error(err); }
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
			let follow_url = 'https://api.twitch.tv/helix/channels/followers?broadcaster_id=71631229';

			//go through the list of accounts, paging forward every 20 if we don't find what we want immediately
			while (!acct_found) {
				await fetch(follow_url, data).then(result => result.json())
				.then(body => {
					//loop through the list of followers to find the one that requested their follow age
					if (body.data != undefined) {
						for (let i = 0; i < body.data.length; ++i) 
							if (body.data[i].user_login == user.username) {//finally found the user following
								acct_found = true;
								let followedDate = new Date(body.data[i].followed_at);
								msg = `has been following for: ${this.helper.getTimePassed(followedDate, true)}`;
								break;
							}
	
						//not found yet, so set the cursor forward and remake request
						follow_url = 'https://api.twitch.tv/helix/channels/followers?broadcaster_id=71631229' + 
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

	async setStreamMarker() {
		try {

			this.#hasTokenExpired();
			const url = 'https://api.twitch.tv/helix/streams/markers';;

			let marker_data = await this.#createTwitchDataHeader();
			marker_data.method = 'POST';
			marker_data.body = JSON.stringify({
				"user_id": 71631229,
				"description": "Funni moment here streemur :-)"
			});

			await fetch(url, marker_data).then((res) => {
				(res.status == 204) ? console.log(`Successfully made stream marker!`) : console.log(`Error, could not change title`);
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

		} catch (err) { return this.#generateAPIErrorResponse(err); }
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
			} catch (err) { return this.#generateAPIErrorResponse(err); }
		}
	}

	async sendTimedShoutout(user, mod) {
		this.#shoutout_queue.push(user);
		if (this.#shoutout_queue.length == 1 && !this.#currently_shouting) {
			await this.sendShoutout(this.#shoutout_queue.shift(), mod);
			this.#currently_shouting = !this.#currently_shouting;
		} else {
			setTimeout(this.sendShoutout, this.#shoutout_queue.length*2*60*1000, this.#shoutout_queue.shift(), mod);
		}
	}

	async sendShoutout(user, mod) {
		try {

			this.#hasTokenExpired();
			const data = await this.#createTwitchDataHeader();

			const user_url = `https://api.twitch.tv/helix/users?login=${user}`;

			const mod_url = `https://api.twitch.tv/helix/users?login=${mod.username}`;

			let channel_id, mod_id;

			//get id of channel to shout out
			await fetch(user_url, data).then(result => result.json()).then(body => {
				channel_id = body.data[0].id;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			//get id of mod/streamer
			await fetch(mod_url, data).then(result => result.json()).then(body => {
				mod_id = body.data[0].id;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			const shoutout_url = `https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=71631229&to_broadcaster_id=${channel_id}&moderator_id=71631229`;

			//do it this way otherwise it runs too fast and just gives 401 errors b/c the client id becomes 'undefined'
			const c_id = await this.#data_base.getIdAndSecret();
			const cc_id = c_id[0];

			const shoutout_data = {
				'method': 'POST',
				'headers': {
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'Client-Id': `${cc_id}`,
					'Content-Type': 'application/json'
				}
			};

			//make shoutout request to API
			await fetch(shoutout_url, shoutout_data).then(result => {
				if (result.status != 204) console.log('Failed to send out shoutout: Code ' + result.status);
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			if (this.#shoutout_queue > 0) {
				this.#currently_shouting = !this.#currently_shouting;
				setTimeout(this.sendShoutout, this.#shoutout_queue.length*2*60*1000, this.#shoutout_queue.shift(), mod);
			}

		} catch (err) { return this.#generateAPIErrorResponse(err); }
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

	//gets and returns the list of tags currently applied to the stream
	async getStreamTags() {
		const tags_url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		let msg = "Tags for this stream are ";

		try {

			this.#hasTokenExpired();

			const data = await this.#createTwitchDataHeader();

			//get the list of tags from the stream
			await fetch(tags_url, data).then(result => result.json()).then(body => {
				for (let i = 0; i < body.data[0].tags.length; ++i) {
					if (i + 1 >= body.data[0].tags.length)
						msg += ` and ${body.data[0].tags[i]}`;
					else 
						msg += `${body.data[0].tags[i]}, `
				}
			}).catch(err => { return this.#generateAPIErrorResponse(err); });
			return msg;
		} catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	//changes the tags of the stream to new ones. Cannot change automatic tags at all
	//@param   list_of_tags   The list of tags we want to have be present in the stream 
	async replaceStreamTags(list_of_tags) {

		const tags_url = `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		//first, read in the contents of the tags list file to memory so we can search it easier

		for (let tag in list_of_tags) {
			if (list_of_tags[tag].length > 25)
				return `Tag "${list_of_tags[tag]}" too long, all tags must be under 25 characters`;
		}

		if (list_of_tags.length > 10)
			return "Too many tags, make sure to remove spaces as necessary";

		//with tags assembled, we send out the request 
		try {
			const s = await this.#data_base.getIdAndSecret();
			const data = {
				'method': 'PATCH',
				'headers': {
					'client-id': `${s[0]}`,
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'Content-Type': 'application/json'
				},
				'body': JSON.stringify({
					'tags': list_of_tags
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

	async createClip() {
		const clip_url = 'https://api.twitch.tv/helix/clips?'

		const data = await this.#createTwitchDataHeader();

		data.method = 'POST';

		let clipping_started = false;
		let clip_id;
		let finished_clip_url = "";

		// clipping is ansync process, so we just grab the Id it sends and confirm its started the clipping process
		await fetch(clip_url + 'broadcaster_id=71631229', data).then(result => result.json().then(clipping_started = result.status)
		).then(body => {
			clip_id = body.data[0].id;
		}).catch(err => console.error(err));

		await this.helper.sleep(15000);

		data.method = 'GET';
		// poll the clip api after 15 seconds of calling it. If no response after 15 seconds, clipping failed
		if (clipping_started) {
			await fetch(clip_url + 'id=' + clip_id, data).then(result => result.json()).then(body => {
				finished_clip_url = body.data[0].url;
			}).catch(err => console.error(err));
		}

		return finished_clip_url;
	}

	async getContentLabels() {
		const label_url= `https://api.twitch.tv/helix/channels?broadcaster_id=71631229`;
		let msg = "Twitch's content warnings for this stream are: ";

		try {

			this.#hasTokenExpired();

			const data = await this.#createTwitchDataHeader();

			await fetch(label_url, data).then(result => result.json()).then(body => {
				if (body.data[0].content_classification_labels.length == 0) msg = "There are no content warnings on this stream";
				else {
					for (let i = 0; i < body.data[0].content_classification_labels.length; ++i) {
						if (i + 1 >= body.data[0].content_classification_labels.length) {
							msg += `and ${body.data[0].content_classification_labels[i]}`;
						} else {
							msg += `${body.data[0].content_classification_labels[i]}, `;
						}
					}
				}
			}).catch(err => console.error(err));

		} catch (err) { return this.#generateAPIErrorResponse(err); }

		return msg;
	}
//693520155
	async sendAnnouncement(announcement) {
		const s = await this.#data_base.getTwitchInfo(3);
		const announcement_url = `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=71631229&moderator_id=71631229`;

		const data = {
			'method': 'POST',
			'headers': {
				'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
				'client-id': `${s[0]}`,
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify({
				'message': announcement,
			})
		};

		await fetch(announcement_url, data);
	}

	async timeoutUser(user) {
		const s = await this.#data_base.getTwitchInfo(3);
		const timeout_url = "https://api.twitch.tv/helix/moderation/bans?broadcaster_id=71631229&moderator_id=71631229";
		const userid_url = `https://api.twitch.tv/helix/users?login=${user}`;

		try {
			this.#hasTokenExpired();
			const user_data = await this.#createTwitchDataHeader();
	
			let user_id = "";
	
			await fetch(userid_url, user_data).then(result => result.json()).then(body => {
				console.log(body);
				user_id = body.data[0].id;
			});
	
			const data = {
				'method': 'POST',
				'headers': {
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'client-id': `${s[0]}`,
					'Content-Type': 'application/json'
				},
				'body': JSON.stringify({
					"data": {
						"user_id": user_id,
						"duration": 10,
						"reason": "Said a chat member defined banned word"
					}
				})
			};
	
			await fetch(timeout_url, data);
		} catch (err) { return this.#generateAPIErrorResponse(err); }

	}

	async createRewards() {
		const rewards = [
			[ 'Australia', 500, '' ],
			[ 'Ban A Word', 100000, 'Bans a SINGLE word for a single month' ],
			[ 'Barrel Roll', 500, '' ],
			[ 'Wide Pope', 500, '' ],
			[
			  'Screen Saver Camera',
			  1000,
			  'Turn my face cam into a DVD screen saver'
			],
			[ 'Long Pope', 500, '' ],
			[ 'Bonk', 500, '' ],
			[ 'Jumpscare', 5000, 'Just be funny when you hit this please' ]
		  ];
		  const rewards_url = 'https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=71631229';
		  try {
			for (const r in rewards) {
				const reward_exists = await this.getCustomReward(rewards[r][0]);
				if (!reward_exists) {
					let new_reward_data = await this.#createTwitchDataHeader();
					new_reward_data.method = 'POST';
					new_reward_data.headers['Content-Type'] = 'application/json';
					let stringified_body = {
						title: `${rewards[r][0]}`,
						cost: `${rewards[r][1]}`,
						is_enabled: true
					};
					if (rewards[r][2] != '') stringified_body.prompt = `${rewards[r][2]}`;
					new_reward_data.body = JSON.stringify(stringified_body);
					await fetch(rewards_url, new_reward_data).then(result => {
						if (result.status == 200) console.log("* Successfully created " + stringified_body.title + " reward");
						else console.log(`* Failed to generate new ${stringified_body.title} reward, response code ${result.status}`);
					});
				} else {
					console.log(`* Reward "${rewards[r][0]}" already exists, skipping recreating it`);
				}
				
			}
		  } catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	async getCustomReward(reward_name) {
		const s = await this.#data_base.getTwitchInfo(3);
		const redemption_url = "https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=71631229";
		let exists = false;

		try {
			this.#hasTokenExpired();
			const redemption_data = await this.#createTwitchDataHeader();

			await fetch(redemption_url, redemption_data).then(result => result.json()).then(body => {
				for (const reward in body.data) {
					if (body.data[reward].title == reward_name) exists = true;
				}
			});
			return exists;

		} catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	// Due to fuckery on Twitch's part, the bot can't actually touch the redemptions since it didn't create them
	// This command is being left in as reference in case Twitch decides to unscuff this part of their API
	async setRedemptionStatus(reward_name) {
		const s = await this.#data_base.getTwitchInfo(3);
		const redemption_url = "https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=71631229";
		let redemption_id = '';
		let is_enabled = true;

		// Step 1: Get specific ID of reward from list of rewards
		try {
			this.#hasTokenExpired();
			const redemption_data = await this.#createTwitchDataHeader();

			await fetch(redemption_url, redemption_data).then(result => result.json()).then(body => {
				for (const reward in body.data) {
					if (body.data[reward].title == reward_name) {
						redemption_id = body.data[reward].id;
						is_enabled = body.data[reward].is_enabled;
					}
				}
					
			});

		} catch (err) { return this.#generateAPIErrorResponse(err); }

		// Step 2: Flip enabled/disabled status of reward using id
		let msg = '';
		try {
			const update_data = {
				'method': 'PATCH',
				'headers': {
					'Authorization': `Bearer ${await this.#data_base.getTwitchInfo(0)}`,
					'client-id': `${s[0]}`,
					'Content-Type': 'application/json'
				},
				'body': JSON.stringify({
					"is_enabled": !is_enabled,
				})
			};
			await fetch(`${redemption_url}&id=${redemption_id}`, update_data).then(result => result.json()).then(body => {
				for (const reward in body.data) {
					if (body.data[reward].is_enabled == (!is_enabled) && body.data != undefined) {
						msg = `${reward_name} is set to ${body.data[reward].is_enabled ? "enabled" : "disabled"}`;
					} else {
						msg = `Unable to change status of ${reward_name}`;
					}
				}
			});
		} catch (err) { return this.#generateAPIErrorResponse(err); }
		return msg;
	}

    //-------------------------------------PRIVATE MEMBER FUNCTIONS------------------------------------------------

    //gets a token for the Helix API that will let me edit my own channel's info (title, tags, category, etc.)
	async #getTwitchToken() {

		try {
			//get all necessary data from the DB and go from there
			const session_info = await this.#data_base.getTwitchInfo(3);

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
			await open(url, {wait:true, /*app:{name:apps.edge}*/}).then(console.log("* Twitch API Page opened"));

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