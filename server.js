/* Main server that handles requests from twitch and serves the state that
   each streamer is in. Queries the Game database */
var http = require('http');

//listen for request from front end
//look up twitch username (gotten from the jquery) in the Game database

