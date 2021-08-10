# TuringMod

This is my own interpretation of a twitch.tv chat bot, spceifically using OpenAI's GPT3 API to mimic the members in the chatroom, 
along with a large handful of other functions.

NOTE: Negotiations for getting approved for live testing the mimicry by OpenAI are ongoing, so currently !post does not work
	  How !post will work will most likely change in the future to keep the bot in line with OpenAI's TOS

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
				* More complex operators (!(factorial), %(modulo), ^(exponents))
				* Parentheses in the problems (i.e. 4 + (3-1))
				* Values for Euler's Number (e) and Pi
				* Negative numbers and decimals
			Further features (trigonometric functions, logarithms) may be added in the future

	- !streamertime: gets the time currently where I am located (Chicagoland Metro Area) in Central Standard Time (CST)
				   * format: HH:MM A.M. or P.M.

	- !customlist: gets a list of all custom commands generated by the streamer and/or their mods. Currently, these are only message 
	               commands, nothing fancy like custom counters or anything similar

	- !suggestion: gets a viewer's suggestion on what should be added to the bot/improved upon and writes it to file to be read
				   and considered later on, probably after stream. 

	= !suggestionlist: gets a comma separated list of all suggestions made to improve the bot and posts them in chat

	- !followage: returns the amount of time that a user has been following the stream. Currently says it in the chatroom, not whispers. 
				  Would need to have the bot verified as a bot on Twitch to do so.
				  * Verification currently in progress

	- !lurk: sets a user as a "lurker" where they will be gone for a bit along with holding a messgae for 
			 why they were lurking. Complementary with !unlurk

	- !unlurk: removes a user from the list of lurkers and returns the time they were "lurking" to the chatroom. Complementary to !lurk

	- !commands: prints a list of all commands (excluding this one) to the chatroom. Does not say what they do or how to invoke, just 
				 the names. 
	
	- !schedule: returns a schedule for the next week starting the day after the command is called in a readable format

	- !accountage: says the age of the account of the user asking

	- !who: reiterates the streamer's bio/summary


MOD/STREAMER ONLY COMMANDS:

	- !addcommand: allows for the creation of custom message commands on the fly, with the command's name being first and then the
				   message. 

	- !removecommand: allows a moderator or the streamer to remove a custom command from the list of commands

	- !so: gives a shoutout to a specified user into the chatroom

	- !flush: cleans out the whole of the prompt for the bot's posting function through OpenAI's GPT-3 API and the number of lines
			  posted so far.
			  
	- !editgame: changes the category on the stream (CURRENTLY IN PROGRESS/BENCHED FOR A LITTLE WHILE)\
				 * most likely to become a similar block of code to change the title/tags for a stream

	- !post: generates a comment through OpenAI's GPT-3 API with the prompt being the comments in the chat
			NOW FULLY ENABLED AS OF AUGUST 10, 2021
			* Called either by myself, the stream's moderators, or the streamer proper. When called, response from API
			  is filtered through a separate engine to remove the chance of inappropriate/offensive tokens making it through
			  and into the chat. Afterwards, I must read the response and approve it before it can be posted. 
			  - Most likely to try to make this process approvable by the moderators of the channel as well
				Just need to find out the best way of actually going about this really


PLANNED FUNCTIONALITIES/FEATURES:

	- a scanner for enabled emotes that the streamer has banned themselves (BTTV/FFZ/Native Twitch). When found, times out the 
	  offending user, removes the message, and shames them in the chatroom. (Add in when stream is big enough to warrant it)
	  (or see long-term list below)
			* will most likely have a .txt or .json file of all currently "banned" emotes for people to knwo what's banned or not

	- Adding the ability to edit a custom command thru chat itself

	- whatever is suggested by viewers during my livestreams, so long as the suggestions are not against TOS.

	- A Clip/Link collection function: 
			* Toggleable with two commands(ish) (maybe !startcollect and !endcollect?)
			* Writes suggestion to file (for later viewing) (setting for the bot)
			* Displays list to console with a command
				- Do this in the chat itself or through the console altogether?

	- !steamlink or !steampage: gets the category name and searches for it thru Steam API and returns a link to it

	- !modlist or !mods: gets a list of all mods through a manager and returns a list through chat
			* Half baked; need to think this out more and get it more concrete

	- !song: simple command that gets the song from Spotify API and returns name + link to song on Spotify
			* Need to get Spotify API for this, maybe a way to link a Spotify acct to the bot?

	- Incredibly long term/highly unlikely goal: making this into something that can actually make money
			* Needs a website and such for this (hyper security needed, user accts and all that)
			* change the custom commands from a .json file (fine for 1 dude) to a real db (for multiple dudes)
			* Need to get linking set up for this stuff as well:
					- Spotify (!song)
					- Twitch (any command that pulls from it)
					- Steam API (may be able to get away with just using a special acct for this)
			* Would definitly require getting into contact with OpenAI to stay on their good side with TOS
					- Probs main selling point, CANNOT LOSE THIS FEATURE OR I WILL BE VERY SAD & WILL UGLY CRY