module.exports = {
	ownerUID: "164736401051484160",
	prefix: "!!",
	themeColor: "#A2CE48",
	defaultCooldown: 2000, // ms
	music: {
		/**
		 * Default: User have to play song a total of 10 seconds for it to count.
		 * If there has been 4 minutes between a pause and resume, consider it a new song entry. Set to 'false' to never create new song document.
		 */
		min_playtime: 10,		// Seconds: Minimum required playtime in order to be registered
		sameSongSpan: 4*60		// Seconds: Timespan between pause and resume you have to have in order to register as a new song
	},
	ratelimit: {
		/**
		 * Default: Accept only 1 presence update per user, per 2 seconds.
		 */
		max: 1,					// Count: Max updates per 'duration' ms (per user)
		duration: 2*1000,		// MS: Duration to keep records of ratelimit
	},
	client: {
		flags: {},
		options: {
			messageCacheMaxSize: 50,
			messageCacheLifetime: 120,
			messageSweepInterval: 120,
			disableMentions: "everyone",
			retryLimit: 3,
			presence: {
				type: "LISTENING",
				name: "to Spotify"
			}
		},
		invitePermission: 537185344, // https://i.thevirt.us/04/i0f5Q.png
	},

	/**
	 * Permissions as bit flags. Used for command access, checked against config and DB.
	 */
	ACCESS: {
		blocked:	1<<0,
		user:		1<<1,
		mod:		1<<2,
		admin:		1<<3,
		community:	1<<4,
		dev:		1<<5,
	},

	/**
	 * Fallback (hard-coded) permissions to look in if DB disallow access.
	 */
	FALLBACK: {
		"164736401051484160": {
			desc: "Virtus, bot dev/creator",
			access: 1<<1|1<<2|1<<3|1<<4|1<<5 // All except blocked
		},
		"109068086191116288": {
			desc: "EDM, community staff",
			access: 1<<1|1<<2|1<<4 // User + mod + community
		}
		/* Example:

		"<USER_ID>": {
			desc: "This is Whumpus, one of the support staff for the bot",
			access: 1<<4
		}

		*/
	},

	/**
	 * Configuration for Users MongoDB documents
	 */
	Users: {
		flags: {
			DEFAULT_NEW_USER: 1<<1,	// A collection of flags to give new registered users.

			blocked: 1<<0,	// User is banned from the bot
			enabled: 1<<1	// Tracking enabled
		}
	},

	Guilds: {
		flags: {
			DEFAULT_NEW_GUILD: 1<<1, // A collection of flags to give new guilds

			blocked: 	1<<0,
			active:		1<<1,
			feed:		1<<2
		}
	}
}