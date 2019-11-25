const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const retry = require("retry");
const {marketUserModel,userTags} = require("../util/database");
const {RedisDB} = require("../util/redis");
const {restartWhenReady} = require("../util/session");
const request = require("request");

module.exports = {
	cmd: "test",
	aliases: ["testing"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner|ACCESS.community,
	dm: true,
	daccess: [""],
	desc: "Generic testing command. Replies with what you say.",
	async exec(msg, cmd, args) {
		looseSearch(args.join(" "), msg.guild.members)
			.then(r => {
				if(r===undefined||r===false) msg.channel.send("Search took too long.");
				else if(r===null) msg.channel.send("No user found.");
				else msg.channel.send("User found, UID `"+r+"`");
			});
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <text>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} lorem ipsum\``);
		msg.channel.send(embed);
	}
};

/**
 * Loose search for user's username or nickname in guilds
 * @param {String} input The name to search for
 * @param {Map} members Discord.js guild members collection
 * @param {Number} [timeout=2000] Max time to allow for search to finish
 * @returns {Promise} Resolves: UID, null if no user, false if timed out.
 * @example
 * let user = looseSearch(args.join(" "), msg.guild.members, 3000);
 * if(!user) return msg.channel.send(user===false?"Search took too long":"Could not find user in guild");
 */
async function looseSearch(input, members, timeout=2000) {
	return new Promise(done => {
		Promise.race([new Promise(r=>setTimeout(()=>{r(done(false));}, timeout)), new Promise(r => {
			let users = members.map(u=>{return {n:u.displayName.toLowerCase(), id:u.id};});
			for (let i = 0; i < users.length; i++) {
				for (let n = 0; n < users[i].n.length; n++) {
					if (users[i].n.slice(0, n).startsWith(input.toLowerCase())) {
						return r(done(users[i].id));
					}
				}
			}
			return r(done(null));
		})]);
	});
}


/**
 * Blocked
{
	DiscordAPIError: Cannot send messages to this user
	at item.request.gen.end(d: \FILES\ D O C U M E N T S\ P R O J E C T S\ NodeJS\ Grafik - bot_v2\ node_modules\ discord.js\ src\ client\ rest\ RequestHandlers\ Sequential.js: 85: 15)
	at then(d: \FILES\ D O C U M E N T S\ P R O J E C T S\ NodeJS\ Grafik - bot_v2\ node_modules\ snekfetch\ src\ index.js: 215: 21)
	at process._tickCallback(internal / process / next_tick.js: 68: 7)
	name: 'DiscordAPIError',
	message: 'Cannot send messages to this user',
	path: '/api/v7/channels/585187341887602719/messages',
	code: 50007,
	method: 'POST'
}

 */