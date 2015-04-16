/* Daemon process that uses Riot's API to find out if a streamer is in
   game. Updates the Game database */
var mongoClient = require('mongodb').MongoClient;
//var server = require('mongodb').Server;
var https = require("https");
var database = "mongodb://localhost:27017/riotContest";
var dbGame = "Game";
var dbOnline = "Online";
var apiDelay = 1200;
/* Full url: "https://<SERVER>.",<riotAPI>, "<SERVER_NAME>/<LOL_ACCOUNT_NAME>" and "?api-key=<APIKEY>" */
var riotAPI = "api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/";
var apiKey = "f6124045-24fa-4756-8dcc-27b3d53bd012";
/* server : server_name */
var servers = {
   "na" : "NA1",
   "br" : "BR1",
   "lan" : "LA1",
   "las" : "LA2",
   "oce" : "OC1",
   "eune" : "EUN1",
   "tr" : "TR1",
   "ru" : "RU",
   "euw" : "EUW1",
   "kr" : "KR"
};

/* Pull the list of summoner names from the "Online" database
INPUT: Nothing.
OUTPUT: Feeds the list of summoner names from the "Online" database to checkIfInGame(). */
function getSummonerNames() {
   mongoClient.connect(database, function(err, db) {
      if(err) {
         /* Handle the error */
         handleDbError(err);
      }
      var docs = [];
      var collection = db.collection(dbOnline);
      var playersCursor = collection.find();
      playersCursor.toArray(function(err, documents) {
         if(err) {
            /* Handle the error */
            handleCursorError(err);
         }
         /* Ensure that the database resource is freed only after the 
            entire cursor has been iterated through*/
         var docs = documents.length;
         /* End of the line */
         function checkDocOff() {
            docs--;
            if(docs == 0) {
               db.close();
            }
         }
         /* Use the Riot API  */
         for(var y = 0; y < documents.length; y++) {
            /* Call a function to query twitch because SOFTWARE DESIGN */
            /* Wait some time so I don't DdoS twitch.tv */
            (function(i) {
               setTimeout(function() {
              //    checkIfInGame(documents[i]);
              console.log(documents[i]);
               }, (i+1)*apiDelay);
               checkDocOff();
            })(y);
         }
      });
   });
}

/* Uses the twitch API to see if a given twitch streamer is online. Modifies
   the "Online" database. 
   INPUT: A document containing information from the "Players" database.
   OUTPUT: Maintains the "Online" database with twitch streamers that are online playing League. */
function checkIfInGame(data) {
   var twitchRequest = https.get(twitchAPI + data.twitchUsername, function(res) {
      var twitchData = '';
      /* Append the twitch stream data */
      res.on('error', function(err) {
         handleResponseError(err);
      });
      res.on('data', function(twitchInfo) {
         twitchData += twitchInfo;
      });
      /* Handle if a streamer is on or offline */
      res.on('end', function() {
         var parsedTwitchData = JSON.parse(twitchData);
         mongoClient.connect(database, function(err, db) {
            if(err) {
               /* Handle the error */
               handleDbError(err);
            }
            var collection = db.collection(dbOnline);
            /* Make a function to close the database. This way the db can be closed from the parent scope when we KNOW
               the children are done. */
            function closeDb() {
               db.close();
            }
            /* User is online and playing League. See if they need to be added to the "Online" database */
            if(parsedTwitchData._total > 0 && parsedTwitchData.streams[0].game == lolGame) {
               /* use the data from twitch to see if this user is already in the "Online" database */
               var onlineCursor = collection.find({twitchUsername: parsedTwitchData.streams[0].channel.display_name});
               onlineCursor.nextObject(function(err, item) { 
                  if(err) {
                     /* Handle the error */
                     handleCursorError(err);
                  }
                  /* They are already in the "Online" database. Do nothing */
                  if(item != null) {
                     /* TODO: make a priority queue and give this twitch streamer the lowest priority */
                  }
                  /* item is null. The user just came online, add them to the "Online" database */
                  else {
                     collection.insert(data);
                  }
                  closeDb();
               });
            }
            /* The user is not online or not playing League. Remove them from the "Online" database */
            else {
               collection.remove(data);
               closeDb();
            }
         });
      });
   });
}

function handleCursorError(err) {
   console.log(err);
   throw err;
}

function handleDbError(err) {
   console.log(err);
   throw err;
}

function handleResponseError(err) {
   console.log(err);
   throw err;
}
getSummonerNames();
