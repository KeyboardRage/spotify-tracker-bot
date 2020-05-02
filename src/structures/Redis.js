const mongoose = require("mongoose");
const assert = require("assert").strict;

/**
 * Redis store handler
 */
module.exports = class Store {
	/**
	 * Creates a new handler for interacting with cached data
	 * @param {Redis} RedisStore The Redis connection for non-volatile storage
	 */
    constructor(RedisStore) {
        this.redis = RedisStore;
	}

	/**
	 * Checks if user has tracking enabled
	 * @param {Snowflake} userID The user ID to check
	 * @returns {Promise<Boolean>}
	 */
    async trackingEnabled(userID) {
		return !!await this.redis.hget("trackUser", userID)
	}
	
	/**
	 * Enables a user: start tracking
	 * @param {Snowflake} userID The users ID
	 * @returns {Promise<Boolean>}
	 */
	async enableUser(userID) {
		return await this.redis.hset("trackUser", userID, true);
	}

	/**
	 * Disables a user: stops tracking
	 * @param {Snowflake} userID The users ID
	 * @returns {Promise<Boolean>}
	 */
	async disableUser(userID) {
		return await this.redis.hdel("trackUser", userID);
	}

	/**
	 * Fetch cached data on the user
	 * @param {Snowflake} userID The user ID to get
	 * @returns {Promise<Object>}
	 */
    async getUser(userID) {
		let doc = await this.redis.hgetall(userID.toString());
		if (!doc||!Object.keys(doc).length) return null;
		doc.a = doc.a.split(";;");
		return doc;
    }

	/**
	 * Removes any cache data on a user
	 * @param {Snowflake} userID The user ID to remove
	 * @returns {Promise<Number>}
	 */
    async removeUser(userID) {
        return await this.redis.del(userID.toString());
    }

	/**
	 * Checks if the currently playing and previous cache is identical
	 * @param {Snowflake} userID The user ID to check
	 * @param {Object} spotifyObj The minimal Spotify object
	 * @returns {Promise<Boolean>}
	 */
	async sameSong(userID, spotifyObj) {
		let doc = await this.getUser(userID);
		if (!doc) return false;

		try {
			assert.deepStrictEqual({
				t: doc.t,
				a: doc.a
			}, {
				t: spotifyObj.t,
				a: spotifyObj.a
			});

			// No errors, so previous and current is identical.
			return true;
		} catch (_) {
			return false;
		}
	}

	/**
	 * Register user playing a song
	 * @param {ObjectId} cacheID The ID to store cache as
	 * @param {Snowflake} userID The users ID
	 * @param {Object} spotifyObj The minimal Spotify object
	 * @async
	 * @returns {ObjectId}
	 */
	async startPlaying(cacheID, userID, spotifyObj) {
		let d = {...spotifyObj, _id: cacheID.toString() }
		d.a = d.a.join(";;");
		await this.redis.hset(userID, d);
		return cacheID;
	}
};