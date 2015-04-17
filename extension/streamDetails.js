var inGameInfo = [];
$(document).ready(function() {
   /* Run the script if we are on twitch.tv */
   /* Since twitch doesn't use http(s) in their urls, this is how I detect if we are on
    * http://www.twitch.tv/directory/game/League%20of%20Legends */
   if($(".directory_header h2").text().trim().substring(0, 17) == "League of Legends") {
      $.get("http://localhost:8000", processGameInfo, "json");
   } 
});

function processGameInfo(data, resStatus, xhr) {
   inGameInfo.push.apply(inGameInfo, data);
   console.log(resStatus);
}
