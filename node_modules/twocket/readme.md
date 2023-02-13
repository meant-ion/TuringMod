# Twocket - (Twitch Socket)

A handy lil wrapper for handing the Twitch Eventsub websockets for Node. This uses ```ws``` for the base socket handling, sets up the subscriptions and allows setting of handlers for each type of response.

## About Twitch Eventsub Websockets

Current in beta, the websocket interface for the Eventsub events is now available. 

Providing an alternative to webhooks (and without having to deal with SSL/ngrok).

Learn more [here](https://dev.twitch.tv/docs/eventsub/handling-websocket-events).

## Prerequisites 

This class just handles the connectivity, you will need to supply: the Twitch user ID, Twitch app client ID & the authorised user access token for that client.

More info [here](https://dev.twitch.tv/).

## Installation

```npm i twocket``` SoonTm

-- **or** -- 

```npm install git+https://github.com/ScottMellors/twocket.git``` 

Add this repo as a dependancy in Node.

## Get Started
 - Create an instance of a Twocket using the contructor
 - Add listeners for which events you want to listen for (each event has their own returned data type for convenience that match the api [here](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types).)
 - start it up with ```start()```

## Event Listeners

Setting up an event listener has two options, for the most common use cases I've included wrapped examples such as ```setOnFollowEvent()``` & ```setOnChannelPointRewardRedeem```. If you want to listen to any of the other scoped events, you can use ```setEventSubHandler("EVENTSUB.SCOPE", (eventDataType) => {})```.

## Contact

Having issues or got a suggestion? Contact me [here](https://linktr.ee/ghostlytuna).