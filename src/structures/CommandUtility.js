const config = require("../../config");
const Discord = require("discord.js");

/**
 * Tool for use in commands
 */
class CommandUtility {
	/**
	 * Creates a new CommandUtility
	 * @param {Class} Discord The D.JS middleware
	 */
	constructor(Discord, config) {
		/**
		 * The Discord.js middleware
		 * @prop {Class} Discord
		 */
		this.Discord = Discord;

		/**
		 * The global config
		 * @prop {Object} config
		 */
		this.config = config;
	}

	/**
	 * Returns a default SpotifyTracker style embed
	 * @param {Message} msg The D.JS message
	 * @returns {RichEmbed}
	 */
	emb(msg) {
		if (!msg) throw new Error("You need to pass the Message object");

		return new this.Discord.MessageEmbed()
			.setTimestamp(new Date())
			.setColor(this.config.themeColor)
			.setFooter(msg.author.tag, msg.author.avatarURL)
	}

	/**
	 * Loosely finds a user by search term(s)
	 * @param {Message} msg The message user sent
	 * @param {Array<String>|String} search The search term(s) to use
	 * @returns {Promise<Snowflake>}
	 */
	findUserID(msg, search) {
		if (!msg || msg.constructor.name!=="Message") throw new Error("Missing message or message is of wrong type");
		if (!search) throw new Error("Missing search term(s)");
		if (Array.isArray(search)) search = search.join(" ");

		// Check mentions first
		if (msg.mentions.members.size) {
			return this._firstUserMention(msg.content);
		}
		if (msg.mentions.users.size) {
			return this._firstUserMention(msg.content);
		}

		let found = null;

		// Loose search with text
		msg.guild.members.cache.find(member => {
			let u = member.nickname;
			if (u) {
				let r = new RegExp(search, "i");
				if (r.test(u)) {
					found = member.id
					return found;
				}
			}
			let r = new RegExp(search, "i");
			if (r.test(member.user.tag)) {
				found = member.id;
				return member.id
			}
		});

		return found;
	}

	_firstUserMention(input) {
		// Normalize nicks
		input=input.replace(/<@!/g, "<@");
		let first = input.match(/<@\d+>/)
		if (!first) return null;
		return first[0].replace(/<|@|>/g, "");
	}

	/**
	 * Search for a channel in this guild
	 * @param {Message} msg The message user sent
	 * @param {Array<String>|String} search The search input
	 * @returns {Promise<Snowflake>}
	 */
	findChannelID(msg, search) {
		if (!msg || msg.constructor.name !== "Message") throw new Error("Missing message or message is of wrong type");
		if (!search) throw new Error("Missing search term(s)");
		if (Array.isArray(search)) search = search.join("-");


		let textOnly = true;
		let channels = msg.guild.channels.cache;

		return new Promise(async resolve => {
			let channel;
			if (/^\d{16,40}$/.test(search)) {
				// UID
				channel = channels.get(search);
				if (channel) {
					if (textOnly) {
						if (channel.type === "text") return resolve(channel.id);
						return resolve(null);
					} else return resolve(channel.id);
				}
				else return resolve(null);
			} else if (/^<#\d{13,40}>$/.test(search)) {
				// channel mention
				channel = channels.get(search.replace(/<|#|>/g, ""));
				if (channel) {
					if (textOnly) {
						if (channel.type === "text") return resolve(channel.id);
						return resolve(null);
					} else return resolve(channel.id);
				} else return resolve(null);
			} else {
				// channel name
				if (textOnly) channel = channels.find(r => r.name.toLowerCase() === search.toLowerCase() && r.type === "text");
				else channel = channels.find(r => r.name.toLowerCase() === search.toLowerCase());

				if (channel) return resolve(channel.id);
				return resolve(await this._looseChannelSearch(search, channels, 2000, textOnly));
			}
		});
	}

	async _looseChannelSearch(input, channels, timeout=2000, textOnly=true) {
		return new Promise(done => {
			Promise.race([new Promise(r=>setTimeout(()=>{r(done(false));}, timeout)), new Promise(_r => {
				let r = channels.map(u=>{return {n:u.name.toLowerCase(), id:u.id};});
				for (let i = 0; i < r.length; i++) {
					for (let n = 0; n < r[i].n.length; n++) {
						if (r[i].n.slice(0, n).startsWith(input.toLowerCase())) {
							let c=r[i];
							if(textOnly) {
								if(c.type==="text") return _r(done(c.id));
								return _r(done(null));
							}
							_r(done(c.id));
						}
					}
				}
				return _r(done(null));
			})]);
		});
	}

	/**
	 * Converts a number in to emoji number. Works also with multi-digit. Preserves leading zeros.
	 * @param {String|Number} number Number to convert to emoji string
	 * @returns {String}
	 */
	num(number) {
		if (isNaN(number)||!Number.isInteger(parseInt(number))) throw new Error("Number must be an interger representation");
		number = number.toString();
		let string = String();

		for(let i=0;i<number.length;i++) {

			// Check if number is exactly only 10
			if (number.length===2 && number==="10") {
				string = "🔟";
				return string;
			}

			switch(number[i]) {
				case "0":
					string+="0️⃣";continue;
				case "1":
					string+="1️⃣";continue;
				case "2":
					string+="2️⃣";continue;
				case "3":
					string+="3️⃣";continue;
				case "4":
					string+="4️⃣";continue;
				case "5":
					string+="5️⃣";continue;
				case "6":
					string+="6️⃣";continue;
				case "7":
					string+="7️⃣";continue;
				case "8":
					string+="8️⃣";continue;
				case "9":
					string+="9️⃣";continue;
			}
		}

		return string;
	}
}

module.exports = new CommandUtility(Discord, config);