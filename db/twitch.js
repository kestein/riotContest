/* Daemon process that monitors the lol streamers. updates the "Online"
   database */
var mongoClient = require('mongodb').MongoClient;
//var server = require('mongodb').Server;
var https = require("https");
var database = "mongodb://localhost:27017/riotContest";
var dbPlayers = "Players";
var dbOnline = "Online";
var lolGame = "League of Legends"
var apiDelay = 1200;
var twitchAPI = "https://api.twitch.tv/kraken/streams?channel=";
//var client = new MongoClient(new Server("localhost", 27017));

/* Pull the list of twitch users from the "Players" database
INPUT: Nothing.
OUTPUT: Feeds the list of streamers from the "Players" database to processTwitchRequest. */
function getTwitchUsernames() {
   mongoClient.connect(database, function(err, db) {
      if(err) {
         /* Handle the error */
         handleDbError(err);
      }
      var docs = [];
      var collection = db.collection(dbPlayers);
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
               console.log("done");
            }
         }
         /* Use the twitch API  */
         for(var y = 0; y < documents.length; y++) {
            /* Call a function to query twitch because SOFTWARE DESIGN */
            /* Wait some time so I don't DdoS twitch.tv */
            (function(i) {
               setTimeout(function() {
                  processTwitchRequest(documents[i]);
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
}

function handleDbError(err) {
   console.log(err);
}

getTwitchUsernames();
