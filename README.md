# TuringMod


This is my own interpretation of a twitch.tv chat bot, spceifically using OpenAI's GPT3 API to mimic the members in the chatroom, along with a handful of other functions

NOTE: Due to a lack of reading comprehension for OpenAI's TOS, The mimicry is now dead until further notice. 
	  I apologize for any problems that this may have caused. 

COMMANDS: 

	- !post: generates a comment through OpenAI's GPT-3 API with the prompt being the comments in the chat
			note: nerfed and killed until further notice.\

	- !isidore: posts a wikipedia link to Isidore of Seville, patron saint of the Internet, and the namesake of my bot

	- !build: posts specs of my current computer build

	- !attention: simple counting command for how many times I have lost my train of thought due to my ADHD

	- !wikirand: posts a link to a random wikipedia article

	- !help: posts a link to this very readme file

	- !roll: generates a dice roll for the user. User can specify:
				1. The number of dice to roll
				2. The number of sides on each dice to be rolled
				3. The minimum roll that can be given on the roll

	- !uptime: gets the uptime of the streamer since they have been live

	- !calc: a twitch chat calculator. Users can put in somewhat complex calculations and get answers. Currently supports:
				* Basic operators (+, -, *, /)
				* More complex operators (!(factorial), %(modulo), ^(exponents))
				* Parentheses in the problems (i.e. 4 + (3-1))
				* Values for Euler's Number (e) and Pi
				* Negative numbers and decimals
			Future features (trigonometric functions, logarithms) may be added in the future

	- !streamertime: gets the time currently where I am located (Chicagoland Metro Area) in Central Standard Time (CST)
				* format: HH:MM A.M. or P.M.