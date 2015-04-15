/* Daemon process that monitors the lol streamers. updates the "Online"
   database */
var mongoClient = require('mongodb').MongoClient;
//var server = require('mongodb').Server;
var https = require("https");
var database = "mongodb://localhost:27017/riotContest";
var dbPlayers = "Players";
var dbOnline = "Online";
var twitchAPI = "https://api.twitch.tv/kraken/streams?channel=";
//var client = new MongoClient(new Server("localhost", 27017));

/* Pull the list of twitch users from the "Players" database */
function getTwitchUsernames() {
   mongoClient.connect(database, function(err, db) {
      if(err) {
         return err;
      }
      var docs = [];
      var collection = db.collection(dbPlayers);
      var playersCursor = collection.find();
      playersCursor.toArray(function(err, documents) {
         if(err == null) {
            /* Use the twitch API  */
            for(var y = 0; y < documents.length; y++) {
               /* Call a function to query twitch because SOFTWARE DESIGN */
               /* Wait some time so I don't DdoS twitch.tv */
               (function(i) {
                  var a = (i+1)*1000;
                  setTimeout(function() {
                     processTwitchRequest(documents[i])
                  }, (y+1)*1200);
               })(y);
            }
         }
         else {
            /* Mongo did not return anything, move along, log it */
         }
      });
   });
}

/* Uses the twitch API to see if a given twitch streamer is online. Modifies
   the "Online" database.*/
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
