/**
 * A file for generic helper functions for the Client.
 * Not meant for program as a whole, nor meant for commands themselves.
 */
const fs = require("fs");
const path = require("path");
const handleErr = require("../../util/ErrorHandler");
const config = require("../../config");
const Command = require("../structures/Command");
// const db = require("../../util/Database");
const ratelimit = require("../util/ratelimits");
const {Mongo} = require("../util/setup");

/**
 * Populates blacklists with data from database.
 * @param {Client} Client The bot Client
 * @param {String} [listenMode="whitelist"] If bot should use blacklisting or whitelisting
 * !!DEPRECATED
 */
async function populateData(Client, listenMode="whitelist") {
	try {
		/**
		 * Both are populated so on-the-fly
		 * mode switch will work smoothly
		 */
		Client.listenMode = listenMode;
	
		//* BLACKLIST
			// Users to ignore tracking on
		Client.presenceBlacklist = new Set();
			// Users to ignore commands on.
		Client.cmdBlacklist = new Set();
		//* WHITELIST
			// Users to track music on
		Client.presenceWhitelist = new Set();
			// Users bot will listen to commands for:
		Client.cmdWhitelist = new Set();
	
		// Fetch models
		const { blacklistModel, whitelistModel } = db;
		
		// Get curated list of users to add to each
		// TODO: Each one could probably be signle query, but separated using aggregation pipeline.
		let blacklist = {
			cmd: await blacklistModel.find({ignore: {$bitsAnySet: config.client.flags.blacklist.cmds}}, ["_id"]),
			presence: await blacklistModel.find({ignore: {$bitsAnySet: config.client.flags.blacklist.presence}}, ["_id"])
		};
		let whitelist = {
			cmd: await whitelistModel.find({listen: {$bitsAnySet: config.client.flags.whitelist.cmds }}, ["_id"]),
			presence: await whitelistModel.find({listen: {$bitsAnySet: config.client.flags.whitelist.presence}, tracking: true}, ["_id"]),
		}
	
		// Append users to the lists
			// Blacklist
		blacklist.cmd.forEach(user => Client.cmdBlacklist.add(user._id));
		blacklist.presence.forEach(user => Client.presenceBlacklist.add(user._id));
			// Whitelist
		whitelist.cmd.forEach(user => Client.cmdWhitelist.add(user._id));
		whitelist.presence.forEach(user => Client.presenceWhitelist.add(user._id));

		// Done
		return true;
	} catch(err) {
		console.error(err);
		return handleErr(err);
	}
}
module.exports.populateData = populateData;


/**
 * Checks if the precense is Spotify
 * @param {Array<Activity>} activities An array of the members activities
 * @returns {Object|Null} Null if no Spotify precense. Else activity data.
 */
function spotify(activities) {
	// console.log(activities)
	let activity = null;
	for(let i=0;i<activities.length;i++) {
		if (activities[i].name === "Spotify" && activities[i].type==="LISTENING") {
			activity = activities[i];
			break;
		}
	}
	return activity;
}
module.exports.spotify = spotify;

/**
 * Strips the Activity containing Spotify from all unnecessary information, and re-formats.
 * @param {Activity} activity The Spotify Activity
 * @returns {Object}
 */
function stripSpotify(activity) {
	return {
		t: activity.details,
		a: activity.state.split(";").map(e=>e.trim()),
		s: activity.createdTimestamp,
		i: activity.assets.largeImage.split(":")[1],
		l: activity.syncID
	};
}
module.exports.stripSpotify = stripSpotify;


/**
 * Loads the commands in to the Client's 'commands' map.
 * @param {Client} Client The bot Client
 */
async function loadCommands(Client) {
	Client.commands = Object();

	const cmdFolderPath = path.join(__dirname, "../commands")
	let folders = fs.readdirSync(cmdFolderPath);
	folders = folders.filter(v => /^\w+$/.test(v));
	if (!folders.length) throw new Error("Could not find any command folders. Make sure you have some.");

	folders.forEach(folder => {
		const filepath = path.join(cmdFolderPath, "./", folder, "./index.js")
		const cmd = require(filepath);
		Client.commands[cmd.cmd] = new Command(filepath, cmd.cmd, cmd, cmd.exec);
	});

	console.log(` ✓ Commands: ${Object.keys(Client.commands).length} loaded`);
}
module.exports.loadCommands = loadCommands;

/**
 * Converts a user message in to command arguments
 * @param {Message} msg The users message
 * @returns {Promise<Object>}
 */
async function parseMessage(msg) {
	if (!msg.content) return {cmd:null, args:null};

	// Fetch prefix if guild, else use default. Populate guild data.
	if(msg.guild) {
		const guild = await Mongo.getGuild(msg.guild.id);

		if (guild) {
			msg.guild.doc = guild;
			msg.prefix = guild.prefix;
		} else msg.prefix = config.prefix;
	} else msg.prefix = config.prefix;

	// Normalize mention, trim, and split spaces
	let args = msg.content.replace(/<@!/, "<@").trim().split(/\s+/g);

	// Check if mentioning bot
	if (args[0] === `<@${msg.client.user.id}>`) args.shift();
	// Stop if message doesn't start with prefix
	else if (!args[0].startsWith(msg.prefix)) return { cmd: null, args: null };
	// If starting with correct prefix, remove it.
	else args[0] = args[0].slice(msg.prefix.length);

	// Remove empty strings
	args = args.filter(Boolean);

	// Assign command as first argument
	let cmd = args.shift();

	return { cmd, args };
}
module.exports.parseMessage = parseMessage;

/**
 * Populates the users permissions based on the database
 * @param {Message} msg The users message
 * @returns {Promise<Number>} Permission level
 */
async function getPermissions(msg) {
	/**
	 * THIS CHECKER DOES NOT CHECK CONFIG FALLBACK. COMMANDS DOES THAT.
	 */


	// Base level for all users
	let permission = config.ACCESS.user;
	
	// Get guild override
	if (msg.guild && msg.guild.doc && msg.guild.doc.p && msg.guild.doc.p.length) {
		let p = msg.guild.docs.p.find(a => a.u===msg.author.id);
		if (p.l) permission = permission|p.l;
	}

	// Get global override
	const userDoc = await Mongo.getUser(msg.author.id);
	if (userDoc) permission = permission|userDoc.p;
	
	return permission;
}
module.exports.getPermissions = getPermissions;


/**
 * Check for alias of a command
 * @param {Object} commands All bot commands
 * @param {String} alias The alias to check
 * @returns {String|Undefined}
 */
function checkAlias(commands, alias) {
	let d = null;
	for (let cmd in commands) {
		if (commands[cmd].aliases.includes(alias)) {
			d = cmd;
			break;
		}
	}
	return d;
}
module.exports.checkAlias = checkAlias;