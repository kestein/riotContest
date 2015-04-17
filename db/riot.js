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
      /* Keeps track of how long to delay the next lookup in accordance to Riot's API ToS */
      var namesRead = 0;
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
         /* For each twitch streamer that is ONLINE  */
         for(var y = 0; y < documents.length; y++) {
            /* For each lolAccount this user has */
            for(var b = 0; b < documents[y].lolAccounts.length; b++) {
               /* increment namesRead to keep track of how much delay a specific lolAccount lookup needs */
               namesRead += 1;
               /* Query live game data using Riot API. some delay due to Riot API ToS */
               (function(delay, playerDoc, lolAccount) {
                  setTimeout(function() {
                     checkIfInGame(playerDoc, lolAccount);
                  }, (delay)*apiDelay);
                  checkDocOff();
               })(namesRead, documents[y], documents[y].lolAccounts[b]);
            }
         }
      });
   });
}

/* Uses the twitch API to see if a given twitch streamer is online. Modifies
   the "Online" database. 
   INPUT: A document containing information from the "Players" database about a specific twitchUsername, a specific lolAccount to look up.
   OUTPUT: Maintains the "Game" database with twitch streamers that are in a League game. */
function checkIfInGame(data, lolAccount) {
   var apiQuery = ""
   apiQuery = "https://" + data.region + "." + riotAPI + servers[data.region] + "/" + lolAccount + "?api_key=" + apiKey;
   console.log(apiQuery);
      var riotRequest = https.get(apiQuery, function(res) {
         var riotData = '';
         /* Append the twitch stream data */
         res.on('error', function(err) {
            handleResponseError(err);
         });
         res.on('data', function(riotInfo) {
            riotData += riotInfo;
         });
         res.on('end', function() {
            /* Something else happened, log the status code and move on */
            if(res.statusCode != 404 || res.statusCode != 200) {
               console.log(res.statusCode);
            }
            /* We got an expected response code. Look into the "Game" database */
            else {
               /* This lolAccount is not in a game. Remove them from the "Game" database. */
               if(res.statusCode == 404) {
                  console.log(res.statusCode);
               }
               /* This lolAccount is in game (res.statusCode == 200). Add them to the "Game" database */
               else {
                  var parsedRiotData = JSON.parse(riotData);
                  console.log(parsedRiotData);
               }
            }
         });
      });
}

function handleCursorError(err) {
   console.log("Cursor error: " + err);
   throw err;
}

function handleDbError(err) {
   console.log("db error: " + err);
   throw err;
}

function handleResponseError(err) {
   console.log("Response error: " + err);
   throw err;
}
getSummonerNames();




//I HAD TO MOVE STUFF FOR TESTING, PUT THIS IN THE FOR LOOP TO CHECK ALL THE SUMMONER NAMES
function placeholder() {

      /* Handle if a streamer is on or offline */
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
}
