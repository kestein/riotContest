/* Front end script that displays champion, game type, and game time info on top of their
 * thumbnail on twitch.tv*/

/* Checks to see if the current page is the League of Legends directory on twitch.tv */
$(document).ready(function() {
   /* Run the script if we are on twitch.tv */
   /* Since twitch doesn't use http(s) in their urls, this is how I detect if we are on
    * http://www.twitch.tv/directory/game/League%20of%20Legends */
   if($(".directory_header h2").text().trim().substring(0, 17) == "League of Legends") {
     // $.get("http://localhost:8000", processGameInfo, "json");
   } 
});

/* Processes the information received from our server
 * INPUT: data received from the request, the response code the server sent us, xmlhttprequest object 
 * OUTPUT: send needed information about specific streamers to showDetails */
function processGameInfo(data, resStatus, xhr) {
   var inGameInfo = [];
   inGameInfo.push.apply(inGameInfo, data);
   for(var y = 0; y < inGameInfo.length; y++) {
      showDetails(inGameInfo[y]);
   }
}

/* Uses jquery to display champion icons, game timer, and game mode graphic on top of their twitch.tv stream thumbnail
 * INPUT: the json received from the "Game" database on the backend 
 * OUTPUT: places the appropriate champion icon, game time, and game mode icons on top of the streamer's twitch.tv thumbnail */
function showDetails(gameDetails) {
   var streamer = $("a").attr('href', "\/" + gameDetails.twitchUsername.toLowerCase());
   /* This selects a specific image. use this to get to the div? */
    $('.thumb a[href^="/imaqtpie"] img').attr("src","http://s.imgur.com/images/logo-1200-630.jpg?2");
}
