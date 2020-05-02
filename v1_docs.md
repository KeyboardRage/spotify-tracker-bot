![Spotify tracker "logo"](https://cdn.discordapp.com/icons/653289817081118724/5669a159eaa69db3cc273025e290b6dc.png "Spotify tracker")
[Discord guild](https://discord.gg/sJUAqQ5)

# Spotify tracker
A Discord bot that tracks songs played, and allow user interaction with that data.

## Set up local bot
### For devs familiar with NodeJS
This is assuming you know your way around a NodeJS project, *and* can set up a Discord bot token and whatnot.

Here's what you need:
1. `.env` file in root directory: see `.env-example`. Populate with approperiate content and rename it to `.env`.
1. Naturally, you need to run a local instance of MongoDB if you're not using a remote connection *(as specified in `.env` file)*.
1. Congifure `/data/config.json` to your liking:
	* `ownerUID` is bot owner Discord UID.
	* `prefix` is the bots prefix.
	* `minimum_playtime` is time *(seconds)* required to play in order for the song to be recorded in to database. If `0`, then all songs will be.
	* `songFeed -> guild` is your guild ID to post song feed in.
	* `songFeed -> channel` is the channel inside your guild to post song feed in.
	* `songFeedEnabled` `true` to enable song feed — **Required that you set up channel and guild ID** *(that above)*. Set to `false` to disable.
1. Configure `/data/permissions.json`:
	* `fallback_data` is permissions that will be checked if you have none in your database. If match in database, database permission will be used.
	* A permission block consist of a permission level, description *(optional)*, and a a users ID:
	```
	"<USER ID>": {
		"permission":<LEVEL>,
		"desc":"<DESCRIPTION>"
	},
	```
	* `ACCESS` is the permissions used by bot when checking permission to execute commands.
	* `Roles` is used when referencing a permission, e.g. in commands to change permissions.
	* Permissions are bitfields.
1. Database structure:
	1. Users collection:
		* Contains information on users, and used as whitelist for users to track.
		* A users document consist of:
			```js
			_id: String, // user ID
			username: String, // User's username (not tag)
			aliases: [String], // Known aliases, including current/past usernames
			playtime: Number, // # seconds of music played in total
			tracking: Boolean, // Enable/disable tracking of user's songs, playtime, etc.,
			permission: Int32 
			/* Permission is optional. Int32 is a Mongoose plugin `mongoose-int32` entity. Basically a type of number. Used as permission override to default: ACCESS.user and/or content in permissions file */
			```
		* Belongs to a collection by the name `users`.
	1. Songs collection:
		* The collection containing played all songs.
		* The structure/object is referred to as `SongSchema`
		* A SongSchema document consist of:
			```js
			artists: [String], // One or more contributing artists
			song: String, // Song title
			image: String, // "Spotify:<image ID>", used as: https://i.scdn.co/image/<image ID>
			start: Date, // Date song started playing
			end: Date, // Date song ended playing
			user_id: String, // A users UID
			user_name: String // A users username (not tag)
			```
		* Belongs to a collection by the name `songsPlayed`.
Done.

## For non-devs
This assumes you do not know jack about coding/setting up bots, etc., but want to run this bot on your computer or whatever. You need four things: NodeJS, MongoDB, bot token, and set up the bot. Follow the steps next sections.
### Setting up a local database
1. Install MongoDB on your computer. See MongoDB's guides for [Windows](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/), [Mac](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/), or [Linux](https://docs.mongodb.com/manual/administration/install-on-linux/).
	1. Select "complete" package.
	1. You want to install it as a service, and just leave stuff default in the installation wizard — unless you know what you're changing.
	1. If asked about installing "Compass" too, it's a "GUI" to connect and interact with your Database, which you may want — else you'll have to rely on CLI.
1. After installation, ensure MongoDB is running and you can connect. Test this by opening your Command prompt/terminal and type `mongo`.
	1. If it says "mongo is not recognized (...)" *(windows)* or "mongo: command not found" *(Mac/Linux)*, try restarting computer. If that didn't work, try re-installing and/or doublecheck you followed MongoDB's steps properly.
	1. If it says it cannot connect, it's likely due to the server is not running. Start with the command `mongod` in Command prompt/Terminal, and open a new Command prompt/Terminal and use the `mongo` command to connect to it. CTRL+C / CMD+C to exit/stop either.
### Installing NodeJS
1. Go to [NodeJS download](https://nodejs.org/en/download/) and install the "LTS" version for your operative system.
1. Go through the installation. Leave defaults.
1. After installation, ensure NodeJS is running and you can use it. Test this by opening your Command prompt/terminal and type `node -v`, which should output version installed.
### Setting up bot folder
1. Click the green "Clone or download" button at the top ([go to index if you don't see it](https://github.com/KeyboardRage/spotify-tracker-bot)) — click "Download as ZIP".
1. Extract and put the folder where you want to keep the bot. You can stop bot and move the folder location later without issues if you have to.
1. Navigate in to the folder, where the `bot.js` file is
1. If you don't see any `.env-example`file, try enabling hidden files:
	* **Windows:** In file explorer, click "Folder" *(or equivilent in your language)* at the top, then "Show hidden files" under the "Show/hide" section.
	* **Mac:** In Finder, press CMD+Shift+Dot to toggle hidden files visibility
1. Rename `.env-example` to `.env`
1. Open the `.env` file with a text editor
1. Replace `your_bot_token_here` with the bot token you get from the next section, and save. The rest can stay as it is.
1. Navigate to the `data` folder, open `config.json` with a text editor.
1. Go through each setting and replace with equivilent content. Be careful that text fields require to have the `"` on both sides. Config explained:
	* `ownerUID` is *your* Discord user ID. [How to get Discord UID](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-).
	* `prefix` is the bots prefix. Default is `!!`, change it if you want to.
	* `minimum_playtime` is time *(seconds)* required to play in order for the song to be recorded in to database. If `0`, then all songs will be.
	* `skipped` is time *(seconds)* required to play in order for the bot to bother posting the song in the feeds channel *(if you enable that)*.
	* `songFeed -> guild` is your guild ID to post song feed in. [How to get Discord UID](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-).
	* `songFeed -> channel` is the channel ID, inside your guild to post song feed in. [How to get Discord UID](https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-).
	* `songFeedEnabled` `true` to enable song feed — **Required that you set up channel and guild ID** *(that above)*. Set to `false` to disable.
	* Save changes.
1. In the same folder, open the `permissions.json` file with your text editor, and change the content accordingly:
	* `fallback_data` is permissions that will be checked if you have none/no overrides in your database.
	* If match in database, database permission will be used.
	* A permission block consist of a permission level, description *(optional)*, and a users ID:
	```
	"<USER ID>": {
		"permission":<LEVEL>,
		"desc":"<DESCRIPTION>"
	},
	```
	* You want to set yourself up here, with the permission level `28`.
	* `ACCESS` is the permissions used by bot when checking permission to execute commands.
	* `Roles` is used when referencing a permission, e.g. in commands to change permissions.
	* Permissions are exact. A `vip` need the `user` permission level too, in order to use `user` level commands — so: `user + vip` is `4 + 8`, which is `12`.
### Setting up your Discord application
1. Go to the [Discord Developer portal](https://discordapp.com/developers/applications/) — log in with your Discord if you have to
1. In the "Applications" panel, select "New Application"
1. Name your Application *(App name/avatar won't be the bot name, nor avatar)*, and leave "Team" as your account unless, unless you know what a team is and how to use it.
1. In your newly created application, navigate to "Bot" tab.
1. Create new bot. Now you will pick a bot name. This name will be the name of the bot, but you can change it later too if you want. In Bot you also pick the bot's avatar.
1. Once created, click "Copy" button by the "Token" part, put it in to the `.env` file as described in previous section. Keep it private and secure, this is used to log in to your bot. Example how the line will look: `BOT_TOKEN=287vnz8fvgbankm3.d8asy2nkem1023b.dn39dbafgnkj381`
1. Invite the bot to your guild:
	1. In the [Discord Developer portal](https://discordapp.com/developers/applications/), go to OAuth2 section
	1. In the "Scope" switchboard, check "bot". Check necessary permissions:
		* "Administrator" alone is enough if you're admin and lazy
		* If not, I recommend: send messages, embed links, attach files, read message history, manage messages, add reactions
	1. When done, copy the generated link between the "Scopes" and "Bot permissions" switchboards. Paste it in to browser to initiate bot invite. Select your guild.
### Starting bot
By now you should be good to go:
Open command prompt/terminal, write `node ` *(space included)*, drag and drop the `bot.js` file in to the terminal to make it generate a path to the file, then click enter. Your bot should now start up and be ready for use.

To stop, press CTRL+C / CMD+C in the command prompt/terminal.
To start it again, you can use arrow up and hit enter, or write "node " again and drop in the file.
