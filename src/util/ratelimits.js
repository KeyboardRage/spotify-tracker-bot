/**
 * A file for setting up various ratelimiting functions
 */

const handleErr = require("../../util/ErrorHandler");
const config = require("../../config");
const { store } = require("../providers/Redis");
const RateLimiter = require("async-ratelimiter");
const ratelimit = new RateLimiter({
	db: store,
	max: config.ratelimit.max,
	duration: 2000
});

/*****************************************************
 *!					W A R N I N G					!*
 *  Redis may experience snapshot saving errors		 *
 * 	during rapid writes. To fix this, set			 *
 *  execute 'sysctl vm.overcommit_memory=1' command	 *
 * 	using sudo, then restart the entire server/PC.	 *
 *  Additionally, disable automatic snapshotting.	 *
 *  Instead, manually initiate `BGSAVE` on your own	 *
 *  intervals (or tune snapshot points).			 *
 *****************************************************

/**
 * Ratelimit for presence updates per user
 * @param {Snowflake} userId The UID of the user to rate-limit
 * @returns {Promise<Boolean>}
 */
const presence = async userId => {
	try {
		// Set up limiter
		const limit = await ratelimit.get({
			id: userId,
			namespace: "presence",
			decrease: true
		});

		// Check if limit reached
		if (!limit.remaining) return true;

		// All is well
		return false;
	} catch (err) {
		console.error("RATE LIMIT ERROR:", err);
		handleErr(err);
		return true;
	}
};
module.exports.presence = presence;

/**
 * Rate limit for commands.
 * Basically command cooldowns, but much fancier 
 * now that we have this stuff set up anyway.
 * @param {Snowflake} userId The UID of the user issuing the command
 * @returns {Promise<Boolean>}
 */
const cmd = async userId => {
	try {
		//TODO: Set up config for all commands or per command.
	
		// Set up limiter
		const limit = await ratelimit.get({
			id: userId,
			namespace: "cmd",
			decrease: false
		});
		// Check if limit reached
		if (!limit.remaining) return false;
		// All is well
		return true;
	} catch (err) {
		console.error(err);
		return handleErr(err);
	}
};
module.exports.cmd = cmd;