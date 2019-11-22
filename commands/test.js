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
		// return msg.channel.send(args.join(" "));
		console.log(msg.client.locks.users.size, msg.client.locks.cmds.size, msg.client.locks.cooldowns.size);
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