const {bot_invite} = require("../data/config.json");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "invite",
	aliases: ["inv"],
	cooldown: {min: 2},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Replies with the invite link for the bot.",
	exec(msg) {
		// The response for help on this command.
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Bot invite", `[Invite link](${bot_invite})`)
			.addField("More information", "For more information about commands, syntax, and the bot in general, visit https://static.grafik-bot.net");
		return msg.channel.send(embed);
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
			.addField("Usage", `\`${doc.prefix}${this.cmd}\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``)
		msg.channel.send(embed);
	}
};