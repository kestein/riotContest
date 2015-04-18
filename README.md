### Twitch Champion Tracker
My entry for the Riot API Challenge: a Twitch.tv plugin that displays what champion a streamer is playing and how long they have been in game for. Additionally, it displays a graphics to show what game mode the streamer is playing.

#DEPENDENCIES
[mongodb](https://www.mongodb.org/downloads)
[node js](https://nodejs.org/download/)
[node js mongodb driver](http://docs.mongodb.org/ecosystem/drivers/node-js/)

#USAGE
This app relies on a mongodb database alongside a node js server. 

To get the mongodb database running:
1. Unzip db/mongobackup/database.zip
2. Do a 'mongorestore' on db/mongobackup
3. Type 'mongo' into your computer's shell to ensure the 'riotContest' database exists

To run the database maintanence scripts:
1. Run 'db/backend'. This process will run the 'twitch.js' and 'riot.js' scripts to maintain their specific collections

To get the server up and running:
1. Run 'node server.js'. This will fire the server up which will listen to requests when on the League of Legends directory on twitch.tv

The front end for this project is still in development and will be out as soon as possible! If you have any questions or concerns, feel free to contact me at kestein42932@gmail.com.

Twitch Champion Tracker isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
