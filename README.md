# TuringMod

REQUIRES VLC TO HANDLE AUDIO FUNCTIONALITY

This wonderful pile of feature bloat and strangeness is my own interpretation of a twitch.tv chat bot, spceifically 
using OpenAI's GPT3 API to mimic the members in the chatroom, along with a large handful of other functions.

A fork of this bot containing only the chat mimicking functions (meant more for multiple channels at once) can be
found here: https://github.com/meant-ion/TuringModLite

The fork of the bot that has all the old functions that are no longer here is under the 'heavy' branch

COMMANDS: 

	- !title: returns the current title of the current stream to the chatroom
			  * Can edit the title if the user is a mod or the streamer

	- !game: returns the current category of the stream
			 * Can edit the game/category if the user is a mod or the streamer

	- !roulette: determines randomly if the asking user will be banned or not on chance

	- !build: posts specs of my current computer build

	- !voice: simple counting command for how many times my voice has cracked while on stream. 

	- !wikirand: posts a link to a random wikipedia article

	- !help: posts a link to this very readme file

	- !roll: generates a dice roll for the user. User can specify:
				1. The number of dice to roll (not required, defaults to 1)
				2. The number of sides on each dice to be rolled (required)
				3. The minimum roll that can be given on the roll (not required, defaults to no minimum roll)
			 * format: !roll (numDice)d(numSidesOnDice)r(MinimumRoll)

	- !flip: simple command that flips a coin and returns either heads or tails. Not much else really

	- !uptime: gets the uptime of the streamer since they have been live

	- !time: gets the time currently where I am located (Chicagoland Metro Area) in Central Standard Time (CST)
			 * format: HH:MM A.M. or P.M.

	- !customlist: gets a list of all custom commands generated by the streamer and/or their mods. 
				   Currently, these are only message 
	               commands, nothing fancy like custom counters or anything similar

	- !sg: gets a viewer's suggestion on what should be added to the bot/improved upon and writes it to file to be read
		   and considered later on, probably after stream. 

	- !followage: returns the amount of time that a user has been following the stream. 
				  Currently says it in the chatroom, not whispers. 
				  Would need to have the bot verified as a bot on Twitch to do so (for whispers).
				  * Verification currently in progress

	- !lurk: sets a user as a "lurker" where they will be gone for a bit along with holding a messgae for 
			 why they were lurking. Complementary with !unlurk

	- !unlurk: removes a user from the list of lurkers and returns the time they were "lurking" to the chatroom. 
			   Complementary to !lurk

	- !leave: similar to !unlurk, but does not need for the user to be lurking and tells the chatroom 
			  they're heading out for a while
	
	- !schedule: returns a schedule for the next week starting the day after the command is called in a readable format

	- !accountage: says the age of the account of the user asking

	- !who: reiterates the streamer's bio/summary

	- !tags: gets and returns all tags currently applied to the stream
			 * Can edit the tags if the user is a mod or the streamer

	- !song: returns the name and artist of the song currently playing on stream through Spotify

	- !skipsong: collects requests to skip the current track and if it hits a threshold, skips the track itself

	- !addsong: adds in a user requested song to the current Spotify playlist via search parameters given by the user

	- !suggestionlist: gets the list of all ideas for the bot not yet implemented but suggested

	- !gitchanges: gets statistics on how much changed from the current repo of this bot to the last one 
				   and posts them in chat as a message

	- !spacepic: gets the NASA Space Picture of the Day and sends it out to chat

	- !freegame: gets a list of all games discounted to free on the Epic Store
				* Does not return games that were always free, free expansions/item packs, or games on sale for more than free

	- !bonk: bonks the user specified by the chat member

	- !adbreak: gives the user the (approximate) time left before an adbreak happens - DEPRECIATED SINCE I NO LONGER RUN ADS ON A SCHEDULE

	- !cw: shows the user Twitch's content warning labels applied to the stream


MOD/STREAMER ONLY COMMANDS:

	- !addcommand: allows for the creation of custom message commands on the fly, with the command's name being first and 
				   then the message. 
				   * Can specifiy if the command is a callable one or one that runs at an interval
				   * Format: !addcommand isInterval(t/f) cmdName rest of message

	- !removecommand: allows a moderator or the streamer to remove a custom command from the list of commands
					  * Can specify whether the command is a callable or interval command
					  * Format: !removecommand isInterval(t/f) cmdName

	- !editcommand: allows a moderator or the streamer to edit a custom command on the list of commands
					* Can specify whether the command is a callable or interval command
					* Format: !editcommand isInterval(t/f) cmdName rest of the message

	- !so: gives a shoutout to a specified user into the chatroom; attached to an EventSub listener for automatic posting of msg

	- !flush: cleans out the whole of the prompt for the bot's posting function through OpenAI's GPT-3 API 
	          and the number of lines posted so far.

	- !startcollect: tells the bot to start collecting any and all twitch clip links and store them into file for the streamer

	- !endcollect: tells the bot to stop collecting twitch clip links

	- !post: generates a comment through OpenAI's GPT-3 API with the prompt being the comments in the chat
			 NOW FULLY ENABLED AS OF AUGUST 10, 2021
			 * Called either the stream's moderators or the streamer proper. When called, response from API
			   is filtered through a separate engine to remove the chance of inappropriate/offensive tokens making it through
			   and into the chat. Afterwards, I must read the response and approve it before it can be posted. 
			 * Currently implementing OpenAI's Model Fine-Tuning API for this bot. If all goes well, the bot will get better with its mimickry

	- !shotgun: takes 1 - 5 chat members and "bans" (times them out for ~10 seconds) them, like they got hit with a shotgun
			    * Not currently enabled, no point with how small my stream is

	- !died: increments the death counter by one whenever I die in a game

	- !rdeaths: resets the death counter back to zero 

	- !testviewers: tests the stream and chatroom's viewer counts to see if there's a good chance of a view botting issue

	- !shutdown: writes everything necessary to file and ends the bot's execution

	- !delvod: deletes the last vod on the channel. Good for handling issues with dox/TOS

	- !skip: skips a TTS channel points redemption

FUNCTIONS HANDLED BY THE BOT AUTOMATICALLY:

	- Posting a warning about an incoming midroll ad break to the chatroom

	- Handling of certain channel point redemptions
				* Sending out a timeout for a specific user
				* VIP-ing a user who spends enough channel points
				* Firing the nerf turret (WIP)
				* Changing chatroom settings (sub only, emote only, unique messages only, etc.)

PLANNED FUNCTIONALITIES/FEATURES:

	*FOR IF/WHEN THE STREAM BECOMES BIG ENOUGH TO WARRANT THESE*
	------------------------------------------------------------

		- a scanner for enabled emotes that the streamer has banned themselves (BTTV/FFZ/7TV/Native Twitch). 
		When found, times out the offending user, removes the message, and shames them in the chatroom. 
		(Add in when stream is big enough to warrant it)
		  (or see long-term list below)
				* will most likely have a .txt or .json file of all currently "banned" emotes for 
				  people to know what's banned or not

		- link permitting and removing
				* a !permit command that will allow for one user to post one link
				* automatically removes all links that are not permittied
					- will need to make compatible with !startcollect and !endcollect

		- a quote delivery function
				* Gets a random quote from a collection of quotes made by me on stream
				* Would need to have people there to witness and record those quotes as well
				* Would need a !addq/!addquote and !delq/!delquote commands for this also

		- yodaposting: same idea as !post, but response is said like yoda would
				* API not free, need to actually be making money to use (lol)

	------------------------------------------------------------

	- whatever is suggested by viewers during my livestreams, so long as the suggestions are not against TOS (Twitch or OpenAI)