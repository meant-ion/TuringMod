import dotenv from 'dotenv';
dotenv.config({ path: './.env'});
import Helper from './helper.js';
import fetch from 'node-fetch';
import open from 'open';
import http from 'http';

export class SpotifyAPI {

    #data_base;
    #spotify_token_get_time;

    //@param   c     The bot's Twitch client
	//@param   d_b   The bot's client for accessing its database
    constructor(d_b) {
        this.helper = new Helper();
        this.#data_base = d_b;
        this.#initSpotifyStuff();
    }

    //gets and returns the song title and name from the streamer's currently playing songs
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async getCurrentSongTitleFromSpotify() {

		const url = `https://api.spotify.com/v1/me/player/currently-playing`;

		try {
			this.#hasTokenExpired();
			//header for everything that we need; gets a promise from DB for access key
			const data = await this.#generateSpotifyHeaders('GET');

			let msg = '';

			//get the data from the API and send out the relevant bits to chat
			await fetch(url, data).then(result => result.json()).then(body => 
				msg = `Now Playing "${body.item.name}" by ${body.item.artists[0].name}`
			).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;

		} catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	//skips the current song playing on spotify and advances to next one; tells chatroom what song is
	//@param   user     The chat member that typed in the command
	//@param   target   The chatroom that the message will be sent into
	async skipToNextSong() {
		const url = `https://api.spotify.com/v1/me/player/next`;

		try {
			this.#hasTokenExpired();
			//header for everything that we need; gets a promise from DB for access key
			const data = await this.#generateSpotifyHeaders('POST');

			let msg = '';

			await fetch(url, data).then(() => msg = this.getCurrentSongTitleFromSpotify());

			return msg;

		} catch (err) { return this.#generateAPIErrorResponse(err); }
    }

	//adds a song to the queue suggested by the chat member if it can be found on spotify
	//@param   user            The chat member that typed in the command
	//@param   target          The chatroom that the message will be sent into
	//@param   search_params   The parameters that will help the computer find the song
	async addSongToQueue(search_params) {
		//first, we need to get the search done to find the right song requested
		//which is why we have search_params passed in

		//have the URLs needed here just so I can keep track of them easier
		let search_url = 'https://api.spotify.com/v1/search';
		let queue_url = 'https://api.spotify.com/v1/me/player/queue';

		//set up a var so we know if a url was passed through for the request
		let need_to_search = true;
		let uri;
		let msg = '';
		let error_arr = ["Error: Cannot enter an explicit song into queue", 
						"Error in adding in song from command. Please try again later"];

		try {
			this.#hasTokenExpired();
			//build the headers needed for both searching for a track and adding it to the queue
			const queue_data = await this.#generateSpotifyHeaders('POST');
			const search_data = await this.#generateSpotifyHeaders('GET');
	
			//check first to see if it is a URL for spotify. 
			let possible_url = this.helper.checkIfURL(search_params);
			if (possible_url != "") {//its a url, so get the track id and go forward from there
				let url = new URL(possible_url);
				uri = `spotify%3Atrack%3A${url.pathname.slice(7)}`;
				queue_url += '?uri=' + uri;
				need_to_search = false;
			}

			if (need_to_search) {//no URL found, so we search for what we need
				//process the input so we can actually get the info we need
				search_params = this.helper.combineInput(search_params, true).slice(1);
				search_params = search_params.replace(/\s+/g, "%20");
				search_url += '?query=' + search_params + '&type=track';

				//searching fetch request to get the song's URI from Spotify
				await fetch(search_url, search_data).then(result => result.json()).then(body => {
					if (body != undefined) {
						//making sure that we do not add in an explicit song into the queue
						if (body.tracks.items[0].explicit != false) {
							msg =  "Error: Cannot enter an explicit song into queue";
						}
						queue_url += '?uri=' + body.tracks.items[0].uri;
					} else {
						msg =  "Error in adding in song from command. Please try again later";
					}	
				}).catch(err => { return this.#generateAPIErrorResponse(err); });
			} else {//no search, but we need to see if its explicit and prevent it from being added if so
				search_url += uri;
				await fetch(search_url, search_data).then(result => result.json()).then(body => {
					if (body.tracks.items[0].explicit != false) {
						msg =  "Error: Cannot enter an explicit song into queue";
					}
				}).catch(err => { return this.#generateAPIErrorResponse(err); });
			}

			//if an error is caught, we return before we try to add a bad song to queue
			if (error_arr.indexOf(msg) != -1) return msg;

			//queue adding fetch request
			await fetch(queue_url, queue_data).then(() => {
				msg = `Requested song was successfully added to song queue`;
			}).catch(err => { return this.#generateAPIErrorResponse(err); });

			return msg;

		} catch (err) { return this.#generateAPIErrorResponse(err); }
	}

	//simple helper to tell us if the token is expired for one of our two main APIs
	//@param   which_token   Bool that tells if we need to check the Twitch or Spotify tokens
	#hasTokenExpired() {

		//get the difference between the time the token was accquired and right now at this call
		const cur_time = new Date();
		//make sure to get the correct token here
		const token_time = this.#spotify_token_get_time; 
		const diff = (cur_time.getTime() - token_time.getTime()) / 1000;

		//if we have a large enough difference between the two times, refresh the specified token
		if (diff >= 3600) this.#refreshSpotifyToken();
	}


	//simple helper for generating an error so I don't have to type as much
	//@param   err      The error that has been generated
	//@param   target   The name of the chatroom we are posting to
	#generateAPIErrorResponse(err) {
		console.error(err);
		return "Error in getting response from Spotify";
	}

	//simple helper similar in function to #createTwitchDataHeader, but just for Spotify instead
	//@param   request_type   Tells what type of request is needed (GET, POST, PATCH, etc.)
	//@return                 A header needed for getting info/doing things with Spotify's Web API
	async #generateSpotifyHeaders(request_type) {
		return {
			'method': `${request_type}`,
			'headers': {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${await this.#data_base.getSpotifyInfo(false)}`
			}
		};
	}

	//initializes all spotify stuff that we will need when we do calls to its API
	async #initSpotifyStuff() {

		try {
			//get our data from the DB
			const session_data = await this.#data_base.getSpotifySessionInfo();

			//build the URLS that we need to access for the requests
			const url = `https://accounts.spotify.com/authorize?client_id=${session_data[0]}&response_type=code&redirect_uri=${session_data[2]}&scope=${session_data[3]}&state=${session_data[4]}`;
	
			let token_url = 'https://accounts.spotify.com/api/token';
	
			let code, encoded_header, params;
	
			//build the server and have it automatically gather the info we need when getting our code
			let s = http.createServer((req, res) => {
	
				//get the auth code
				let u = new URL(req.url, "http://localhost:4000");
				if (u.searchParams.get('code') != null) code = u.searchParams.get('code');
	
				//build the items necessary to get the tokens
				let b = Buffer.from(session_data[0] + ':' + session_data[1], 'utf-8')
				encoded_header = {
					'Authorization': `Basic ${b.toString('base64')}`,
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				};
				params = {
					'code': code,
					'grant_type': "authorization_code",
					'redirect_uri': session_data[2],
				}
				res.end();
			}).listen(4000);
	
			//open the url and get what we want from it
			await open(url, { wait: true }).then(console.log("* Spotify Test Page Opened!"));
	
			//with all data gathered, we send out a fetch request and get the tokens stored
			await fetch(token_url, { method: 'POST', headers: encoded_header, body: new URLSearchParams(params).toString()} )
			.then(result => result.json()).then(body => {
				this.#data_base.writeSpotifyTokensToDB(body.access_token, body.refresh_token);
				this.#spotify_token_get_time = new Date();//get the time the token was made too, for refresh purposes
				console.log("* Spotify Tokens Get!");
			}).catch(err => { console.error(err); });
	
			s.close();

		} catch (err) { console.error(err); }
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
		const refresh_token = await this.#data_base.getSpotifyInfo(true)[1];
		const params = {
			'code': refresh_token,
			'grant_type': "refresh_token",
		};

		//push through the request and retrieve our new access token
		await fetch(token_url, { method: 'POST', headers: encoded_header, body: new URLSearchParams(params).toString()} )
		.then(result => result.json()).then(body => {
			//no need to get a new refresh token, that's ours now. Just a new access token
			this.#data_base.writeSpotifyTokensToDB(body.access_token, refresh_token);
			this.#spotify_token_get_time = new Date();//get the time the token was made too, for refresh purposes
		});
	}

}

export default SpotifyAPI;