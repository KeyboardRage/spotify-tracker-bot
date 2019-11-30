const {RedisDB} = require("../util/redis");
const fn = require("./response_functions");
const retry = require("retry");

module.exports.add_cooldown = add_cooldown;
async function add_cooldown(/**@type {String}*/userId, /**@type {String}*/cmd, /**@type {Number}*/cooldown) {
	// Date = now + cooldown = date
	RedisDB.set(`${userId}:${cmd}:cmd`, // Key
		Date.now()+cooldown*1000, // Value: Date.now() + cooldown*1000 = future date
		"EX", // Expire
		cooldown, err => { // After future date time
			if(err) return;
		});
}

module.exports.check_cooldown = check_cooldown;
async function check_cooldown(/**@type {String}*/userId, /**@type {String}*/cmd) {
	return new Promise((resolve,reject) => {
		RedisDB.get(`${userId}:${cmd}:cmd`, (err,res) => {
			if(err) return reject(err);
			return resolve(res);
		});
	});
}

module.exports.set_session = set_session;
async function set_session(userId, command, guildId=false) {
	return new Promise(resolve => {
		if(!guildId) {
			RedisDB.hset("sessions", userId+":"+command, true, (err, res) => {
				if(err) throw err;
				return resolve(res);
			});
		} else {
			RedisDB.hset("sessions", guildId+":"+command, userId, (err, res) => {
				if (err) throw err;
				return resolve(res);
			});
		}
	});
}

module.exports.check_session = check_session;
async function check_session(userId, command, guildId=false) {
	return new Promise(resolve => {
		if(!guildId) {
			RedisDB.hget("sessions", userId+":"+command, (err, res) => {
				if(err) throw err;
				return resolve(res);
			});
		} else {
			RedisDB.hget("sessions", guildId+":"+command, (err, res) => {
				if (err) throw err;
				return resolve(res);
			});
		}
	});
}

module.exports.del_session = del_session;
async function del_session(userId, command, guildId=false) {
	return new Promise(resolve => {
		if(!guildId) {
			RedisDB.hdel("sessions", userId+":"+command, (err, res) => {
				if(err) throw err;
				return resolve(res);
			});
		} else {
			RedisDB.hdel("sessions", guildId + ":" + command, (err, res) => {
				if (err) throw err;
				return resolve(res);
			});
		}
	});
}

module.exports.restartWhenReady = restartWhenReady;
async function restartWhenReady(Client, callback) {
	Client.block_all = true;
	// Sessions = the thing that contain all locks.
	// `${userId}:${cmd}` = All cooldowns. Might be useful for waiting on small tasks to finish.
	retry_until_ready(Client, "sessions", (err, res) => {
		if (err) {
			Client.block_all = false;
			throw err;
		}
		if (res) {
			// eslint-disable-next-line no-console
			console.error("Could not wait any longer for locks. Forcing restart.");
			fn.notifyErr(Client, new Error("**Could not wait any longer:** forcibly restarting the client."));
			return callback();
		} else {
			fn.notify(Client, "**Restart success:** No sessions. Restart ready.", "green");
			return callback();
		}
	});
}

module.exports.retry_until_ready = retry_until_ready;
async function retry_until_ready(Client, collection, cb) {
	var operation = retry.operation({retries:10, minTimeout:2*1000,maxTimeout:10*1000, randomize:true});
	operation.attempt(function(currentAttempt) {
		RedisDB.hgetall(collection, (err,res) => {
			// Check cooldowns too.
			if (operation.retry(res)) {
				// eslint-disable-next-line no-console
				console.log(Client.locks.users.size, Client.locks.cmds.size, Client.locks.cooldowns.size);
				// eslint-disable-next-line no-console
				console.log("Still session, waiting.");
				return;
			}
			cb(err ? operation.mainError() : null, res);
		});
	});
}

// retry_until_ready(Client, "sessions", (err, res) => {
// 	if (err) {
// 		Client.block_all = false;
// 		throw err;
// 	}
// 	if (res) {
// 		// eslint-disable-next-line no-console
// 		console.error("Could not wait any longer for locks. Forcing restart.");
// 		fn.notifyErr(Client, new Error("**Could not wait any longer:** forcibly restarting the client."));
// 		return callback();
// 	} else {
// 		// Repeat with cooldowns too, just in case.
// 		retry_until_ready(Client, "", (err, res) => {
// 			if (err) {
// 				Client.block_all = false;
// 				throw err;
// 			}
// 			if (res) {
// 				// eslint-disable-next-line no-console
// 				console.error("Could not wait any longer for cooldowns. Forcing restart.");
// 				fn.notifyErr(Client, new Error("**Could not wait any longer:** forcibly restarting the client."));
// 				return callback();
// 			} else {
// 				fn.notify(Client, "**Restart success:** No sessions. Restart ready.", "green");
// 				return callback();
// 			}
// 		});
// 	}
// });