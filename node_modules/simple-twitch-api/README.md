<div align="center">
  <br />
  <h1>SIMPLE TWITCH API</h1>
  <br />
  <p>
    <a href="https://www.npmjs.com/package/simple-twitch-api"><img src="https://img.shields.io/npm/v/simple-twitch-api.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/simple-twitch-api"><img src="https://img.shields.io/npm/dt/simple-twitch-api.svg?maxAge=3600" alt="NPM downloads" /></a>
     <a href="https://www.npmjs.com/package/simple-twitch-api"><img alt="Snyk Vulnerabilities for npm package" src="https://img.shields.io/snyk/vulnerabilities/npm/simple-twitch-api"></a>
     <a href="https://www.npmjs.com/package/simple-twitch-api"><img alt="Snyk Vulnerabilities for npm package" src="https://img.shields.io/bundlephobia/min/simple-twitch-api"></a>
     <a href="https://www.npmjs.com/package/simple-twitch-api"><img alt="Snyk Vulnerabilities for npm package" src="https://img.shields.io/npm/l/simple-twitch-api"></a>		  
  </p>
 </div>
 
[![NPM](https://nodei.co/npm/simple-twitch-api.png)](https://nodei.co/npm/simple-twitch-api/)

A simpler way to interact with the Twitch API (helix version : https://dev.twitch.tv/docs/api/reference).

All POST (except OauthToken request) and PUT are in developpement.

Updated for ES6 !

## Launch date 

 - Test Build : 10/10/2020
 - V1 : 20/10/2020

## Install
```
$ npm install simple-twitch-api
```
## Example
```js
//Get stream informations

let Twitch = require('simple-twitch-api');

const { CLIENT_ID, CLIENT_SECRET } = require("./log.json");
const SCOPE = "user:read:email";

Twitch.getToken(CLIENT_ID, CLIENT_SECRET, SCOPE).then(async result => {

	let access_token = result.access_token;
        
	let user = await Twitch.getUserInfo(access_token, CLIENT_ID , "alex_off");
	let user_id = user.data[0].id;
	
	let stream_info = await Twitch.getStream(access_token, CLIENT_ID, user_id);
	
	console.log(stream_info.data[0]);
});
```

## Maintainers

- [Coulay Alexandre](https://github.com/alexandrecoulay)

## License

[MIT License](LICENSE).
