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
	RedisDB.removeAllListeners();
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

/**
 * Redis number incremental. Returns new number
 * @param {String} key The unique key to increment
 * @param {Boolean} [get=false] Returns current value without increment
 * @returns {Number} The new or existing number.
 * @example
 * let id = redisIncrement("job");
 */
function redisIncrement(field, get=false) {
	if(get) {
		RedisDB.get(`counter:${field}`, (err,res) => {
			return res;
		});
	} else {
		RedisDB.incr(`counter:${field}`, num => {
			return num;
		});
	}
}
module.exports.redisIncrement = redisIncrement;

/**
 * Adds a user to Redis for CMD's locked (cannot use cmd while locked)
 * @param {String} user User's UID
 * @param {String} cmd The command, non-alias
 * @param {String} [guild=false] Define GuildID if locked for guild only
 * @returns {Number} 0 = No commit. 1 = Successfull commit.
 * @example
 * lock(msg.author.id, cmd, "123123123123");
 */
async function lock(user, cmd, guild=false) {
	return new Promise((resolve,reject) => {
		if(!guild) {
			RedisDB.hset("locks", `${cmd}:${user}`, true, (err,res) => {
				if(err) return reject(err);
				return resolve(res);
			});
		} else {
			RedisDB.hset(`locks:${guild}`, `${cmd}:${user}`, true, (err,res) => {
				if(err) return reject(err);
				return resolve(res);
			});
		}
	});
}
module.exports.lock = lock;

/**
 * Removes a user from a lock.
 * @param {String} user User's UID
 * @param {String} cmd The command, non-alias
 * @param {String} [guild=false] Define GuildID if unlocking only for guild
 * @returns {Number} 0 = None found. 1 = Delete successful
 * @example
 * unlock(msg.author.id, cmd, "123123123123");
 */
async function unlock(user, cmd, guild = false) {
	return new Promise((resolve, reject) => {
		if (!guild) {
			RedisDB.hdel("locks", `${cmd}:${user}`, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		} else {
			RedisDB.hdel(`locks:${guild}`, `${cmd}:${user}`, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		}
	});
}
module.exports.unlock = unlock;

/**
 * Checks if a user is locked from command
 * @param {String} user User's UID
 * @param {String} cmd The command, non-alias
 * @param {String} [guild=false] Define GuildID if checking guild specific
 * @returns {Boolean} null = None found. True = Is locked.
 * @example
 * checkLock(msg.author.id, cmd, "123123123123");
 */
module.exports.checkLock = checkLock;
async function checkLock(user, cmd, guild=false) {
	return new Promise((resolve, reject) => {
		if (!guild) {
			RedisDB.hget("locks", `${cmd}:${user}`, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		} else {
			RedisDB.hget(`locks:${guild}`, `${cmd}:${user}`, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		}
	});
}