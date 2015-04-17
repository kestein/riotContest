/* Main server that handles requests from twitch and serves the state that
 * each streamer is in. Queries the Game database */
var http = require('http');
var mongoClient = require('mongodb').MongoClient;
var database = "mongodb://localhost:27017/riotContest";
var dbGame = "Game";

http.createServer(function(req, res) {
   /* go to the "Game" database and pull the data currently there */
   fetchGames(res);
}).listen(8000, 'localhost');

function fetchGames(res) {
   mongoClient.connect(database, function(err, db) {
      if(err) {

      }
      var collection = db.collection(dbGame);
      var gameCursor = collection.find();
      gameCursor.toArray(function(err, docs) {
         if(err) {

         }
         writeGameData(docs, res);
         db.close();
      });
   });
}

function writeGameData(docs, res) {
   res.writeHead(200, {'Content-Type' : 'tapplication/json'});
   res.end(JSON.stringify(docs));
}
