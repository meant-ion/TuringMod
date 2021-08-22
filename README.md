# TuringMod

This wonderful pile of feature bloat and strangeness is my own interpretation of a twitch.tv chat bot, spceifically 
using OpenAI's GPT3 API to mimic the members in the chatroom, along with a large handful of other functions.

Most likely, I will end up making a fork of this repo that is just for the !post and !flush commands, and keep the other parts of the
bot listed here for my own personal channel

COMMANDS: 

	- !isidore: posts a wikipedia link to Isidore of Seville, patron saint of the Internet, and the namesake of my bot

	- !follow: reminder command to have people in chat to follow the channel. Set up as an automatic posting as well

	- !title: returns the current title of the current stream to the chatroom

	- !game: returns the current category of the stream

	- !roulette: determines randomly if the asking user will be banned or not on chance

	- !build: posts specs of my current computer build

	- !voice: simple counting command for how many times my voice has cracked while on stream. 

	- !wikirand: posts a link to a random wikipedia article

	- !help: posts a link to this very readme file

	- !roll: generates a dice roll for the user. User can specify:
				1. The number of dice to roll (not required, defaults to 1)
				2. The number of sides on each dice to be rolled (required)
				3. The minimum roll that can be given on the roll (not required, defaults to no minimum roll)
			* format: !roll(numDice)d(numSidesOnDice)r(MinimumRoll)

	- !flip: simple command that flips a coin and returns either heads or tails. Not much else really

	- !uptime: gets the uptime of the streamer since they have been live

	- !calc: a twitch chat calculator. Users can put in somewhat complex calculations and get answers. Currently supports:
				* Basic operators (+, -, *, /)
				* More complex operators (!(factorial), %(modulo/remainder), ^(exponents))
				* Parentheses in the problems (i.e. 4 + (3-1))
				* Values for Euler's Number (e) and Pi
				* Negative numbers and decimals
			Further features (trigonometric functions, logarithms) may be added in the future

	- !time: gets the time currently where I am located (Chicagoland Metro Area) in Central Standard Time (CST)
				   * format: HH:MM A.M. or P.M.

	- !customlist: gets a list of all custom commands generated by the streamer and/or their mods. Currently, these are only message 
	               commands, nothing fancy like custom counters or anything similar

	- !suggestion: gets a viewer's suggestion on what should be added to the bot/improved upon and writes it to file to be read
				   and considered later on, probably after stream. 

	= !suggestionlist: gets a comma separated list of all suggestions made to improve the bot and posts them in chat

	- !followage: returns the amount of time that a user has been following the stream. Currently says it in the chatroom, not whispers. 
				  Would need to have the bot verified as a bot on Twitch to do so (for whispers).
				  * Verification currently in progress

	- !lurk: sets a user as a "lurker" where they will be gone for a bit along with holding a messgae for 
			 why they were lurking. Complementary with !unlurk

	- !unlurk: removes a user from the list of lurkers and returns the time they were "lurking" to the chatroom. Complementary to !lurk

	- !commands: prints a list of all commands (excluding this one) to the chatroom. Does not say what they do or how to invoke, just 
				 the names. 
	
	- !schedule: returns a schedule for the next week starting the day after the command is called in a readable format

	- !accountage: says the age of the account of the user asking

	- !who: reiterates the streamer's bio/summary

	- !song: returns the name and artist of the song currently playing on stream through Spotify

	- !skipsong: collects requests to skip the current track and if it hits a threshold, skips the track itself

	- !dictrand: get a random word from the Merriam-Webster dictionary along with its function and definition and sends it to chat

	- !gitchanges: gets statistics on how much changed from the current repo of this bot to the last one and posts them in chat as a message

	- !convert: converts an amount of one currency input by the user into the equivalent amount of a currency specified by the user
			* Format: !convert Currency_To_Convert_From Currency_To_Convert_To amount

	- !pokerand: gets the data from a randomly found Pokémon; Tried to keep the message sent as close to the anime format as I could (as best I remember it really)

	- !numrand: gets a fact about a randomly generated number and posts it to chat


MOD/STREAMER ONLY COMMANDS:

	- !addcommand: allows for the creation of custom message commands on the fly, with the command's name being first and then the
				   message. 
				   * Can specifiy if the command is a callable one or one that runs at an interval

	- !removecommand: allows a moderator or the streamer to remove a custom command from the list of commands
					  * Can specify whether the command is a callable or interval command

	- !editcommand: allows a moderator or the streamer to edit a custom command on the list of commands
					* Can specify whether the command is a callable or interval command

	- !so: gives a shoutout to a specified user into the chatroom

	- !flush: cleans out the whole of the prompt for the bot's posting function through OpenAI's GPT-3 API and the number of lines
			  posted so far.

	- !startcollect: tells the bot to start collecting any and all twitch clip links and store them into file for the streamer

	- !endcollect: tells the bot to stop collecting twitch clip links
			  
	- !editgame: changes the category on the stream (CURRENTLY IN PROGRESS/BENCHED FOR A LITTLE WHILE)\
				 * most likely to become a similar block of code to change the title/tags for a stream

	- !botlinks: allows channel moderators/streamer to control if the bot can post links in chat or not
				* useful to avoid conflicts with NightBot/StreamLabs/StreamElements/etc.

	- !post: generates a comment through OpenAI's GPT-3 API with the prompt being the comments in the chat
			NOW FULLY ENABLED AS OF AUGUST 10, 2021
			* Called either the stream's moderators or the streamer proper. When called, response from API
			  is filtered through a separate engine to remove the chance of inappropriate/offensive tokens making it through
			  and into the chat. Afterwards, I must read the response and approve it before it can be posted. 


PLANNED FUNCTIONALITIES/FEATURES:

	*FOR IF/WHEN THE STREAM BECOMES BIG ENOUGH TO WARRANT THESE*
	------------------------------------------------------------

		- a scanner for enabled emotes that the streamer has banned themselves (BTTV/FFZ/Native Twitch). When found, times out the 
		  offending user, removes the message, and shames them in the chatroom. (Add in when stream is big enough to warrant it)
		  (or see long-term list below)
				* will most likely have a .txt or .json file of all currently "banned" emotes for people to know what's banned or not

		- a "quiet mode" for the stream
				* will automatically remove all messages trying to directly @ the streamer from chat

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

	- get further testing for the calculator, specifically for negative numbers

	- freegame cmd, tells about free games from epic games store (!epicfree ?)

	- (MAJOR MAYBE) have !exchange be able to convert currencies into their values as crypto (dunno about this one morally tbh)

	- a command that gets the space image of the day from NASA's API and displays it in the top-right corner of the stream as a source
			* Need to research more on how to do that
			* Need to rate-limit this one too, only one image a day so tens or hundreds of calls a stream = waste of bandwidth

	- once !changegame is finally working, make a similar command (!changetitle ?) that will edit the stream title too
			* Maybe edit the tags as well?

	- !modlist or !mods: gets a list of all mods through a manager and returns a list through chat
			* Half baked; need to think this out more and get it more concrete

	- ensure that the prompt is reset after a certain constraint is met
			* a character limit is reached for the channel (2000 character limit, need to test this on bigger channel)
			* the !post command goes through sucessfully