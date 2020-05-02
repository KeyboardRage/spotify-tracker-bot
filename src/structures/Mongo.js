const mongoose = require("mongoose");
const assert = require("assert").strict;
const config = require("../../config");

module.exports = class MongoHandler {
    constructor({users, guilds, songs}) {
		if (!users) throw new Error("Missing 'users' model");
		if (!guilds) throw new Error("Missing 'guilds' model");
		if (!songs) throw new Error("Missing 'songs' model");
		/**
		 * Model for users
		 * @prop {Model} users
		 */
		this.users = users;
		/**
		 * Model for guilds
		 * @prop {Model} guilds
		 */
		this.guilds = guilds;
		/**
		 * Model for songs
		 * @prop {Model} songs
		 */
		this.songs = songs;
		/**
		 * The global bot config
		 * @prop {Object} config
		 */
		this.config = config;
    }

	/**
	 * Update playtime of a song record
	 * @param {Object} spotifyObj The minimal Spotify object gotten from cache
	 * @async
	 */
    async stopPlaying(spotifyObj) {
		spotifyObj = await spotifyObj;
		if (!spotifyObj || !spotifyObj.s || !spotifyObj._id) return;

		const endDate = new Date();

		let playTime = 0;
		if (spotifyObj.s.constructor.name === "Date") playTime = parseInt(((endDate.getTime() - spotifyObj.s.getTime()) / 1000).toFixed(0));
		else playTime = parseInt(((endDate.getTime() - new Date(parseInt(spotifyObj.s)).getTime()) / 1000).toFixed(0));

		if (isNaN(playTime)||!Number.isInteger(playTime)) throw new Error(`Playtime is invalid. Got ${typeof(playTime)} with he value '${playTime}'`);

		// Update document by cache ID
		let r = await this.songs.updateOne({
			_id: new mongoose.mongo.ObjectId(spotifyObj._id)
		}, {
			$set: {
				e: endDate
			},
			$inc: {
				pt: playTime
			}
		});
    }

	/**
	 * Fetches a user by ID. Returns MongoDB document
	 * @param {Snowflake} userID The users UID
	 * @returns {Promise<MongooseDocument>}
	 */
	async getUser(userID) {
		return await this.users.findById(userID);
	}

	/**
	 * Updates the user tag of a user
	 * @param {Snowflake} userID The users UID
	 * @param {String} userTag The users new tag
	 * @async
	 * @abstract
	 */
	async updateTag(userID, userTag) {
		this.users.updateOne({_id:userID}, {$set:{t:userTag}});
	}

	/**
	 * Enables tracking on a user
	 * @param {Snowflake} userID The UID of the user
	 * @param {String} userTag The user's tag (username#0000)
	 * @returns {Promise<Object>}
	 */
	async enableUser(userID, userTag) {
		let userDoc = await this.getUser(userID);
		
		if (!userDoc) {
			// Create new user
			userDoc = new this.users({
				_id: userID,
				tag: userTag,
				flags: this.config.Users.flags.DEFAULT_NEW_USER,
				count: 0
			});

			return userDoc.save(err => {
				if (err) {
					console.error(err);
					return {
						nModified: 0,
						n: 0
					};
				}
				return {
					nModified: 1,
					n: 0
				};
			});
		} else return await this.users.updateOne({ _id: userID }, { $bit: {f: { or: this.config.Users.flags.enabled }}, $set:{t:userTag} });
	}

	/**
	 * Disable tracking on a user
	 * @param {Snowflake} userID The user to disable tracking on
	 * @returns {Promise<Object>}
	 */
	async disableUser(userID) {
		return await this.users.updateOne({ _id: userID }, { $bit: {f: { and: this.config.Users.flags.enabled*1-1 }}});
	}

	/**
	 * Registers a new guild, or update state to make guild active again
	 * @param {Guild} guild The guild bot was added to
	 * @returns {Promise}
	 * @async
	 */
	async newGuild(guild) {
		let guildDoc = await this.getGuild(guild.id);
		if (!guilDoc) {
			// Create new guild document
			guildDoc = new this.guilds({
				_id: guild.id, 
				name: guild.name,
				permission: []
			});

			guildDoc.save(err=>{
				if (err) throw err;
				return true;
			});
		} else {
			// If this guild is banned, auto-leave
			if (guildDoc.flags & config.Guilds.flags.blocked) return guild.leave();

			// Set state to active
			this.guilds.updateOne({_id:guild.id}, {$bit:{f:{or: this.config.Guilds.flags.active}}, $set:{l: null}});
		}
	}

	/**
	 * Returns a guild document by ID
	 * @param {Snowflake} guildID The guild ID to get
	 * @returns {Promise<MongooseDocument>}
	 */
	getGuild(guildID) {
		return this.guilds.findById(guildID);
	}

	/**
	 * Marks guild as not active, and adds a "leave" date
	 * @param {Snowflake} GuildID The guild the bot left
	 * @returns {Promise<Boolean>}
	 * @async
	 */
	async leaveGuild(GuildID) {
		await this.guilds.updateOne({ _id: GuildID}, {$bit:{f:{and: this.config.Guilds.flags.active*1-1}}, $set:{l: new Date()}});
		return true;
	}

	/**
	 * Returns the last song the user played
	 * @param {Snowflake} userID The users ID
	 * @returns {Promise<MongooseDocument>}
	 */
	async lastPlayed(userID) {
		let lastSong = await this.songs.findOne({u: userID}).sort({_id: -1}).limit(1);
		return lastSong;
	}

	/**
	 * Generates a new MongoDB ObjectID
	 * @returns {ObjectId}
	 */
	get newID() {
		return new mongoose.mongo.ObjectId();
	}

	/**
	 * Register user start playing a song
	 * @param {ObjectId} cacheID The ID to store new song as
	 * @param {Member} member The guild member
	 * @param {Object} spotifyObj The minimal Spotify object
	 * @returns {Promise<ObjectId>} The ObjectID to store cache under
	 */
	async startPlaying(Client, cacheID, member, spotifyObj) {
		// Check current song is their last played
		let lastSong = await this.lastPlayed(member.user.id);
		
		// No document, register new song
		if (!lastSong) {
			await this._newSong(Client, cacheID, member.user.id, spotifyObj);
			return cacheID;
		}

		// Must be converted for assert to work
		lastSong = lastSong.toObject();

		// Compare if old = new
		try {
			assert.deepEqual({
				title: lastSong.t,
				artists: lastSong.a
			}, {
				title: spotifyObj.t,
				artists: spotifyObj.a
			});

			cacheID = lastSong._id;

			// Identical, overwrite start/end of old
			let d = await this.songs.updateOne({
				_id: new mongoose.mongo.ObjectId(cacheID)
			}, {
				$set: {
					s: new Date(parseInt(spotifyObj.s)),
					e: null
				}
			});
		} catch (_) {
			// If not identical, close previous song if any. Override cache ID with a new ID.
			cacheID = await this._closeSong(lastSong, spotifyObj, member);

			// Not identical, new song
			await this._newSong(Client, cacheID, member.user.id, spotifyObj);
		}

		// Return the ID to set in cache
		return cacheID;
	}

	/**
	 * For when a user finishes one song and a new one starts. Returns new ID to use for new song.
	 * @param {Object} lastSong The last song played (MongoDB document)
	 * @param {Object} spotifyObj The minimal Spotify object
	 * @param {Member} member The user
	 * @returns {Promise<ObjectId>}
	 */
	async _closeSong(spotifyObj) {
		await this.stopPlaying(spotifyObj);
		return this.newID;
	}

	/**
	 * Stores a new song object
	 * @private
	 * @async
	 * @param {ObjectId} cacheID The MongoDB object ID to store as
	 * @param {Snowflake} userID The users ID
	 * @param {Object} spotifyObj The minimal Spotify object
	 */
	async _newSong(Client, cacheID, userID, spotifyObj) {
		// New song document
		const doc = new this.songs({
			_id: cacheID,
			artists: spotifyObj.a,
			title: spotifyObj.t,
			user: userID,
			icon: spotifyObj.i,
			start: spotifyObj.s,
			listen: spotifyObj.l
		});

		await doc.save();
		await this.increasePlayCount(userID);
		Client.emit("newSong", {userID, spotifyObj});
		return true;
	}

	/**
	 * Increase a users song play count by 1
	 * @param {Snowflake} userID
	 * @returns {Promise<Boolean>}
	 */
	async increasePlayCount(userID) {
		return !!await this.users.updateOne({_id: userID}, {$inc:{c:1}});
	}

	/**
	 * Enable Webook feed and stores the webhook URL for a guild
	 * @param {Snowflake} guildID The guild's ID
	 * @param {String} url The Webhook URL
	 * @returns {Promise<Object>}
	 */
	async setWebhook(guildID, url) {
		return await this.guilds.updateOne({
			_id:guildID
		}, {
			$set: {
				w: url
			},
			$bit: {
				f: {and: this.config.Guilds.flags.feed}
			}
		});
	}

	/**
	 * Mark user as member of one or more guilds (if user exist in DB)
	 * @param {Snowflake} userID The users ID
	 * @param {Snowflake|Array<Snowflake>} guildID The guild(s) this user is in
	 * @returns {Promise<Object>}
	 */
	async addUserToGuild(userID, guildID) {
		if (Array.isArray(guildID)) return await this.users.updateOne({_id: userID}, {$addToSet:{g: {$each: guildID}}});
		return await this.users.updateOne({_id: userID}, {$addToSet:{g: guildID}});
	}

	/**
	 * Mark users as NOT member of one or more guilds (if user exist in DB)
	 * @param {Snowflake} userID The users ID
	 * @param {Snowflake|Array<Snowflake>} guildID The guild(s) this user left
	 * @returns {Promise<Object>}
	 */
	async removeUserFromGuild(userID, guildID) {
		if (Array.isArray(guildID)) return await this.users.updateOne({_id: userID}, {$pull: {g: {$in: guildID }}});
		return await this.users.updateOne({_id: userID}, {$pull: {g: guildID}});
	}
	
	/**
	 * Removes a guild ID from all users records
	 * @param {Snowflake} guildID The guild to remove
	 * @returns {Promise<Object>}
	 */
	async removeGuildFromAll(guildID) {
		return await this.users.updateMany({g: guildID}, {$pull:{g: guildID}});
	}

	/**
	 * Add the new guild to all users in this guild that also have DB records
	 * @param {Snowflake} guildID The guild's ID
	 * @param {Array<Snowflake>} members An array of this guilds members by ID
	 * @returns {Promise<Object>}
	 */
	async syncUsersWithNewGuild(guildID, members) {
		return await this.users.updateMany({_id: {$in: members}}, {$addToSet:{g: guildID}});
	}

	/**
	 * Returns the top N Spotify listeners in a given guild
	 * @param {Snowflake} guildID The guild to get list from
	 * @param {Number} [count=10] How many records to return
	 * @returns {Promise<Array<Object>>}
	 */
	async topListeners(guildID, count=10) {
		const list = await this.users.aggregate([
			// Find all users that is listed to be in this guild
			{ $match: { g: guildID}},

			// 1. From the 'songs' collection:
			// 2. Use the user._id field value to look for matching value ...
			// 3. ... in "songs.u" (userID) ...
			// 4. ... and populate those docs in to the respective documents as a list of "songs"
			{$lookup: {
				from: "songs",
				localField: "_id",
				foreignField: "u",
				as: "songs"
			}},

			// Spread out all the songs
			{$unwind: "$songs"},

			// Group by user ID...
			{
				$group: {
					_id: "$_id",
					count: {$sum:1}, // How many times this song ID appears
					playTime: {$sum: "$songs.pt"} // Pluss together total playtime (seconds),
				}
			},

			// Sort with most play time first, then by count if conflict for same spot
			{$sort: {
				playTime: -1,
				count: -1
			}},

			// Return the first 10 (i.e. top 10)
			{$limit: count}
		]);

		return list;
	}

	/**
	 * Returns the most N listened songs a user have
	 * @param {Snowflake} userID The users ID
	 * @param {Number} [count=10] How many records to return
	 * @returns {Promise<Array<Object>>}
	 */
	async topByUser(userID, count=10) {
		const list = await this.songs.aggregate([
			// Find records by user
			{ $match: { u: userID } },

			// Since 'l' is sort a track UID, group all songs ...
			{
				$group: {
					_id: "$l",
					count: { $sum: 1 }, // How many times this song ID appears
					playTime: { $sum: "$pt" }, // Pluss together total playtime (seconds),
					artists: { $first: "$a" },
					title: { $first: "$t" },
					icon: { $first: "$i" }
				}
			},

			// Sort with most plays first, then by playTime if conflict for same spot
			{
				$sort: {
					count: -1,
					playTime: -1
				}
			},

			// Return the first 10 (i.e. top 10)
			{ $limit: count }
		]);

		return list;
	}

	/**
	 * Returns the top N played songs in a given guild
	 * @param {Snowflake} userID The guilds ID
	 * @param {Number} [count=10] How many records to return
	 * @returns {Promise<Array<Object>>}
	 */
	async topTracks(guildID, count=10) {
		const list = await this.users.aggregate([
			// Find all users that is listed to be in this guild
			{$match: {g: guildID}},

			// 1. From the 'songs' collection:
			// 2. Use the user._id field value to look for matching value ...
			// 3. ... in "songs.u" (userID) ...
			// 4. ... and populate those docs in to the respective documents as a list of "songs"
			{$lookup: {
				from: "songs",
				localField: "_id",
				foreignField: "u",
				as: "songs"
			}},

			// Spread out all the songs
			{$unwind: "$songs"},

			// Since 'l' is sort a track UID, group all songs ...
			{
				$group: {
					_id: "$songs.l",
					count: {$sum:1}, // How many times this song ID appears
					playTime: {$sum: "$songs.pt"}, // Pluss together total playtime (seconds),
					artists: {$first: "$songs.a"},
					title: {$first: "$songs.t"},
					icon: {$first: "$songs.i"}
				}
			},

			// Sort with most plays first, then by playTime if conflict for same spot
			{$sort: {
				count: -1,
				playTime: -1
			}},

			// Return the first 10 (i.e. top 10)
			{$limit: count}
		]);

		return list;
	}

	/**
	 * Get a random song that has been played in a guild
	 * !WARNING A user existing does not guarantee they have songs on record!
	 * @param {Snowflake} guildID The guilds ID
	 * @returns {Promise<Object>}
	 */
	async randomGuildSong(guildID) {
		let docs = await this.users.aggregate([
			// Get all users in this guild
			{$match:{g: guildID}},
			// Pick a random one
			{$sample:{size:1}},
			// Fetch their song plays
			{$lookup: {
				from: "songs",
				localField: "_id",
				foreignField: "u",
				as: "songs"
			}},
			// Unwind songs
			{$unwind: "$songs"},
			// Use random song
			{$sample: {size:1}},
			// Return only essential data
			{$project: {
				"songs":1,
				"_id":0
			}}
		]);
		if (!docs.length) return null;
		return docs[0];
	}

	/**
	 * Get random song a user have played
	 * !WARNING A user existing does not guarantee they have songs on record!
	 * @param {Snowflake} userID The users ID
	 * @returns {Promise<Object>}
	 */
	async randomUserSong(userID) {
		let docs = await this.songs.aggregate([
			// Find all records this user has
			{$match:{u: userID}},
			// Return a random one
			{$sample:{size:1}}
		]);
		if (!docs.length) return null;
		return docs[0];
	}

	/**
	 * Fetch a count of how many songs this user have in their records
	 * @param {Snowflake} userID The users ID
	 * @returns {Promise<Object>}
	 */
	async userSongCount(userID) {
		let docs = await this.songs.aggregate([
			// Find all records this user has
			{$match:{u: userID}},
			// Count entires user has
			{$group:{_id:"$u", count:{$sum:1}}},
			// Return only count
			{$project:{_id:0,count:1}}
		]);
		if (!docs.length) return {count:0};
		return {count: docs[0].count}
	}
}