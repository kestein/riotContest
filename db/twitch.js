/* Daemon process that monitors the lol streamers. updates the Online
   database */
var mongoClient = require('mongodb').MongoClient;
var https = require("https");
var database = "mongodb://localhost:27017/riotContest";
var dbName = "Players";
var twitchAPI = "https://api.twitch.tv/kraken/streams?channel=";

function getTwitchUsernames() {
   mongoClient.connect(database, function(err, db) {
      if(err) {
         return err;
      }
      var collection = db.collection(dbName);
      var playersCursor = collection.find();
      /* Use the twitch API  */
      playersCursor.forEach(function(data) {
         /* Call a function to query twitch because SOFTWARE DESIGN */
         /* Wait some time so I don't DdoS twitch.tv */
         setTimeout(processTwitchRequest(data), 1000);
      });
   });
}

function processTwitchRequest(data) {
   var twitchRequest = https.get(twitchAPI + data.twitchUsername, function(res) {
      var twitchData = '';
      /* Append the twitch stream data */
      res.on('data', function(twitchInfo) {
         twitchData += twitchInfo;
      });
      /* Handle if a streamer is on or offline */
      res.on('end', function() {
         var parsedTwitchData = JSON.parse(twitchData);
         /* Since I am querying individual channels, _total will only be 
            0 or 1*/
         if(parsedTwitchData._total > 0) {
            console.log(data.twitchUsername + " is online!");
         }
         else {
            console.log(data.twitchUsername + " is offline.");
         }
      });
   });
}

getTwitchUsernames();
