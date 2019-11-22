const {RedisDB} = require("../util/redis");
const fn = require("./response_functions");
const retry = require("retry");

module.exports.set_session = set_session;
async function set_session(userId, command) {
	return new Promise(resolve => {
		RedisDB.hset("sessions", userId+":"+command, true, (err, res) => {
			if(err) throw err;
			return resolve(res);
		});
	});
}

module.exports.check_session = check_session;
async function check_session(userId, command) {
	return new Promise(resolve => {
		RedisDB.hget("sessions", userId+":"+command, (err, res) => {
			if(err) throw err;
			return resolve(res);
		});
	});
}

module.exports.del_session = del_session;
async function del_session(userId, command) {
	return new Promise(resolve => {
		RedisDB.hdel("sessions", userId+":"+command, (err, res) => {
			if(err) throw err;
			return resolve(res);
		});
	});
}

module.exports.restartWhenReady = restartWhenReady;
async function restartWhenReady(Client, callback) {
	Client.block_all = true;

	retry_until_ready(Client, "sessions", (err, res) => {
		console.log(err,res);
		if (err) {
			Client.block_all = false;
			throw err;
		}
		if (res) {
			console.error("Could not wait any longer. Forcing restart.");
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
	var operation = retry.operation({retries:10, minTimeout:2*1000,maxTimeout:5*1000, randomize:true});
	operation.attempt(function (currentAttempt) {
		RedisDB.hgetall(collection, (err,res) => {
			// Client.locks = {users: new Set(), cmds: new Set(), cooldowns: new Map()};

			// Check cooldowns too.
			if (operation.retry(res)) {
				console.log(Client.locks.users.size, Client.locks.cmds.size, Client.locks.cooldowns.size);
				console.log("Still session, waiting.");
				return;
			}
			cb(err ? operation.mainError() : null, res);
		});
	});
}

