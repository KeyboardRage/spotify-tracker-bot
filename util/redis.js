const chalk = require("chalk");
const redis = require("redis");
const RedisDB = redis.createClient();
const {serverSettings,globalBans} = require("./database"),
	fn = require("./response_functions");
module.exports.RedisDB = RedisDB;

RedisDB.on("ready", () => {
	console.info(chalk.black.bgGreen(" ✓ ") + " Connected Redis.");
});
RedisDB.on("error", err => {
	console.error(chalk.black.bgRed(" × ") + " Could not connect to Redis:", err);
	throw err;
});

/**
 * Checks Cache for prefix. Fallback checks MongoDb. Fallback is default prefix.
 */
function getPrefix(msg) {
	if(msg.channel.type==="dm") return process.env.PREFIX; // is DM
	return new Promise(resolve => {
		RedisDB.hget("serverPrefixes", msg.guild.id, (err,data) => {
			if(err) {
				console.log("Error querying RedisDB. Trying MongoDB. Error:", err);
				fn.notifyErr(msg.client, err);
			}
			if(data) {
				return resolve(data);
			} else {
				serverSettings.findOne({_id:msg.guild.id}, (err,server) => {
					if(err) {
						console.log("Error querying MongoDB. Using default. Error:", err);
						fn.notifyErr(msg.client, err);
						return resolve(process.env.PREFIX);
					}
					else if (server) {
						return resolve(server.prefix);
					}
					else {
						console.log("No server in RedisDB or Database. Using default.");
						return resolve(process.env.PREFIX);
					}
				});
			}
		});
	});
}
module.exports.getPrefix = getPrefix;

/**
 * Flushes RedisDB DB.
 */
function flushRedisDB(cb) {
	RedisDB.flushdb(cb());
}

/**
 * Goes throguh every server in MongoDB and add them to RedisDB cache.
 */
function cacheServerRedisDB() {
	serverSettings.find({}, (err,data) => {
		if(err) throw new Error(err);
		else {
			if(!data) {
				console.log("No database data found.");
				return;
			} else {
				data.forEach(server => {
					RedisDB.hset("serverPrefixes", server._id, server.prefix);
				});
				console.log("Server prefixes cached.");
			}
		}
	});
}

/**
 * Flushes RedisDBDB and re-generates.
 */
function rebuildRedisDB() {
	flushRedisDB(()=>{
		cacheServerRedisDB(()=>{
			console.log("RedisDB rebuild complete.");
		});
	});
}
module.exports.rebuildRedisDB = rebuildRedisDB;

/**
 * Adds a server and its prefix to the RedisDB cache.
 * @param {String} serverId The server's id
 * @param {String} prefix The server's selected prefix
 */
function addServerToCache(guildId, prefix) {
	RedisDB.hset("serverPrefixes", guildId, prefix, callback => {
		console.log("Added server to cache.");
	});
}
module.exports.addServerToCache = addServerToCache;

/**
 * Removes a server from the RedisDB cache
 * @param {String} serverId The guild's ID
 */
function removeServerToCache(guildId) {
	RedisDB.hdel("serverPrefixes", guildId, callback => {
		console.log("Removed server from cache.");
	});
}
module.exports.removeServerToCache = removeServerToCache;

/**
 * Changes a server's prefix in RedisDB cache.
 * @param {String} guildId The Guild's ID
 * @param {String} prefix The new prefix
 * @param {Function} callback Gives (err,reply)
 * @returns {Function} the callback.
 */
function changeServerPrefix(guildId, newPrefix, cb) {
	RedisDB.hset("serverPrefixes", guildId, newPrefix, (err,reply) =>{
		if(err) {
			console.error(`[${Date()}] changeServerPrefix → Error setting newprefix ${newPrefix} for server ${guildId}:`);
			console.error(err);
			if(cb) return cb(err,reply);
			else return reply;
		} else {
			if(cb) return cb(null,reply);
			else return reply;
		}
	});
}
module.exports.changeServerPrefix = changeServerPrefix;

/**
 * TODO: Add bans to cache. Add only ID's, and then use MongoDB to query for the ID.
 */
function cacheGlobalBans() {
	globalBans.find({}, (err, data) => {
		if (err) throw new Error(err);
		else {
			if (!data) {
				console.log("No database data found.");
				return;
			} else {
				data.forEach(doc => {
					if (doc.global && (doc.until == null || !datePassed(doc.until))) {
						RedisDB.sadd("globalBans", doc._id);
					}
				});
				console.log("Global bans cached.");
			}
		}
	});
}
module.exports.cacheGlobalBans = cacheGlobalBans;

async function isBanned(uid) {
	// Define ban checker.
	let ban = id => new Promise(resolve => {
		RedisDB.sismember("bannedIds", id, (_, reply) => {
			return resolve((reply === "0") ? false : true);
		});
	});

	return new Promise(async resolve => {
		// Check single UID
		if (typeof (uid) === "string") {
			let x = await ban(uid);
			return resolve(x);
		}
		
		// Check multiple UID's
		else if (Array.isArray(uid)) {
			let results = Array();
			await asyncForEach(uid, async id => {
				let x = await ban(id);
				results.push(x);
			});
			return resolve(results.includes(true));
		}
	});
}
module.exports.isBanned = isBanned;

async function setBan(uid, bool) {
	if(bool) {
		RedisDB.sadd("globalBans", uid, err => {
			if(err) throw err;
		});
	} else if (!bool) {
		RedisDB.srem("globalBans", uid, err => {
			if(err) throw err;
		});
	}
}
module.exports.setBan = setBan;

// Async forEach definition
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
	await callback(array[index], index, array);
  }
}



/**
 * Simple function to check if the passed in date is passed.
 * @param {Date} existingDate The date you want to see if current time is past or not.
 * @returns {Boolean} True if passed, false if not.
 */
function datePassed(existing) {
	// Check if EXISTING date have yet to be. True or false.
	// console.log("Checking date..");
	if (existing == null) return false;
	let past = new Date(existing);
	return (past.getTime() < Date.now());
}
module.exports.datePassed = datePassed;