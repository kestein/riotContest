/* Daemon process that uses Riot's API to find out if a streamer is in
 * game. Updates the Game database */
var mongoClient = require('mongodb').MongoClient;
var https = require("https");
/* The location and name of the database */
var database = "mongodb://localhost:27017/riotContest";
var dbGame = "Game";
var dbOnline = "Online";
var apiDelay = 1200;
/* The 3 min delay for spectating a League game */
var spectateDelay = 180;
/* Full url: "https://<SERVER>.",<riotAPI>, "<SERVER_NAME>/<LOL_ACCOUNT_NAME>" and "?api-key=<APIKEY>" */
var riotAPI = "api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/";
/* Original API key no stealerino. */
var apiKey = "LOL PUT YOUR API KEY HERE";
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
 * INPUT: Nothing.
 * OUTPUT: Feeds the list of summoner names from the "Online" database to checkIfInGame(). */
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
          * entire cursor has been iterated through*/
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
 * the "Online" database. 
 * INPUT: A document containing information from the "Players" database about a specific twitchUsername, a specific lolAccount to look up.
 * OUTPUT: Maintains the "Game" database with twitch streamers that are in a League game. */
function checkIfInGame(data, lolAccount) {
   var apiQuery = "";
   apiQuery = "https://" + data.region + "." + riotAPI + servers[data.region] + "/" + lolAccount + "?api_key=" + apiKey;
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
         if(res.statusCode != 404 && res.statusCode != 200) {
            handleResponseError("Ya goofed");
         }
         /* We got an expected response code. Connect to the "Game" database for CRUD */
         else {
            mongoClient.connect(database, function(err, db) {
               if(err) {
                  /* Handle the error */
                  handleDbError(err);
               }
               var collection = db.collection(dbGame);
               /* Make a function to close the database. This way the db can be closed from the parent scope when we KNOW
                * the children are done. */
               function closeDb() {
                  db.close();
               }
               /* This lolAccount is not in a game. Remove them from the "Game" database. */
               if(res.statusCode == 404) {
                  collection.remove({summonerNo: lolAccount});
                  closeDb();
               }
               /* This lolAccount is in game (res.statusCode == 200). Add them to the "Game" database */
               else {
                  /* Used for inserting game data into the "Game" database */
                  var parsedRiotData = JSON.parse(riotData);
                  var ourSummoner = findParticipant(parsedRiotData.participants, lolAccount);
                  /* This should not happen since one of the participants SHOULD be the account we looked up.
                   * If this does happen contact Riot.*/
                  if(ourSummoner == null) {
                     closeDb();
                     throw "err"
                  }
                  /* use the data from riot to see if this account is already in game */
                  var inGameCursor = collection.find({summonerNo : lolAccount});
                  inGameCursor.nextObject(function(err, item) { 
                     if(err) {
                        /* Handle the error */
                        handleCursorError(err);
                     }
                     /* They are already in the "Game" database. Update the entry. */
                     /* The reason I update everything is that there may be an instance where a streamer is in one game and then
                      * joins a new game before this script has the chance to delete the entry. Updating all of the fields will
                      * alleviate this issue. */
                     if(item != null) {
                        collection.update({summonerNo : lolAccount}, {
                           "twitchUsername" : data.twitchUsername,
                           "gameMode" : parsedRiotData.gameQueueConfigId,
                           "summonerNo" : lolAccount,
                           "timeElapsed" : parsedRiotData.gameLength + spectateDelay,
                           "champion" : ourSummoner.championId
                           });
                     }
                     /* The twitch streamer just entered a game. Add an entry in the "Game" database. */
                     else {
                        collection.insert({
                           "twitchUsername" : data.twitchUsername,
                           "gameMode" : parsedRiotData.gameQueueConfigId,
                           "summonerNo" : lolAccount,
                           "timeElapsed" : parsedRiotData.gameLength + spectateDelay,
                           "champion" : ourSummoner.championId
                         });
                     }
                     closeDb();
                  });
               }
            });
         }
      });
   });
}

/* Goes through the list of plays in the game and pulls out the one belonging to the twitch streamer
   INPUT: the list of participants in this game, the account of the participant we want
   OUTPUT: the participant's JSON */
function findParticipant(participants, lolAccount) {
   for(var i = 0; i < participants.length; i++) {
      if(participants[i].summonerId == lolAccount) {
         return participants[i];
      }
   }
   return null;
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
