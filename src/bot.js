const handleErr = require("../util/ErrorHandler");
const Discord = require("discord.js");
const config = require("../config");
const Client = new Discord.Client(config.client.options);
const fn = require("./util/helpers");
const ratelimit = require("./util/ratelimits");
const {Store, Mongo} = require("./util/setup");

/**
 * Populate blacklist/whitelist, and set which mode
 */
// fn.populateData(Client, config.client.listenMode);

/**
 * Load commands and whatnot
 */
fn.loadCommands(Client);

/**
 * Log in console when ready
 */
Client.login(process.env.BOT_TOKEN);

/**
 * Log in to the bot
 */
Client.on("ready", ()=>{
	Client.cooldowns = new Map(); // Contains command cooldowns. //TODO: Move to Redis with TTL later.
	console.info(` ✓ ${Client.user.tag} ready!`);
});

/**
 * Throw an error if error
 */
Client.on("error", err => {
	return handleErr(err);
});

/**
 * Listen for command executions
 */
Client.on("message", async msg => {
	// Ignore other bots
	if (msg.author.bot) return;

	// Deconstruct message in to command
	let {cmd, args} = await fn.parseMessage(msg);

	// Check alias
	if (!msg.client.commands[cmd]) cmd = fn.checkAlias(msg.client.commands, cmd);
	
	// Stop if no command
	if (!cmd) return;

	// Fetch permissions
	msg.permission = await fn.getPermissions(msg);

	// Run command
	let result = await msg.client.commands[cmd].run(msg, args);
});

/**
 * Here's where the magic happens!
 * Listen to users precense updates
 */
Client.on("presenceUpdate", async (oldMember, member) => {
	// Decide ignoring
	if (!oldMember) return;
	if (!await Store.trackingEnabled(member.user.id)) return;

	// Get Spotify precense. Else return null and ignore.
	let spotify = fn.spotify(member.activities);

	// Check if user /was/ playing Spotify at all
	if (!spotify) {
		// Ratelimit user presence data updates. Especially needed if same user is in multiple guilds.
		if (await ratelimit.presence(`stop:${member.user.id}`)) return;
		await Store.removeUser(member.user.id);
		return;
	}

	// console.log("a");
	// Ratelimit user presence data updates. Especially needed if same user is in multiple guilds.
	if (await ratelimit.presence(`start:${member.user.id}`)) return;

	// Strip Spotify activity from things we don't need too
	spotify = fn.stripSpotify(spotify);
	// console.log("c");

	// Check cache if new song is same as current.
	if (await Store.sameSong(member.user.id, spotify)) return;
	// console.log("d");

	// Generate new ID, which eventual new song will be stored as
	let cacheID = Mongo.newID;
	// Overwrite ID if previous and current song is the same one, with its ID
	cacheID = await Mongo.startPlaying(Client, cacheID, member, spotify);
	// Cache playing song by ID
	Store.startPlaying(cacheID, member.user.id, spotify);
});

Client.on("guildCreate", g => {
	Mongo.newGuild(g);
	Mongo.syncUsersWithNewGuild(g.id, g.members.cache.keyArray())
});

Client.on("guildDelete", g => {
	Mongo.leaveGuild(g.id);
	Mongo.removeGuildFromAll(g.id);
});

Client.on("guildMemberAdd", m => {
	Mongo.addUserToGuild(m.id, m.guild.id);
});

Client.on("guildMemberRemove", m => {
	Mongo.removeUserFromGuild(m.id, m.guild.id);
});

Client.on("newSong", async ({userID, spotifyObj}) => {
	let members = Client.guilds.cache.get("653289817081118724").members;
	if (!members.cache.has(userID)) return;
	let member = members.cache.get(userID).user.tag

	Client.channels.cache.get("653289962686644257")
		.send(new Discord.MessageEmbed()
			.setTimestamp(new Date())
			.setColor(config.themeColor)
			.setFooter("Song feed", Client.user.avatarURL())
			.setTitle(member)
			.setThumbnail(`https://i.scdn.co/image/${spotifyObj.i}`)
			.addField(spotifyObj.a.join(", "), `[${spotifyObj.t}](https://open.spotify.com/track/${spotifyObj.l})`));
});

module.exports = Client;