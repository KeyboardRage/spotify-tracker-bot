const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "vote",
	aliases: ["vote"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm:true,
	desc: "Get link(s) to pages where you can vote for the bot.",
	exec(msg) {
		// The response for help on this command.
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Vote for the bot", "If ya' like the bot, consider voting.")
			.addField("Link(s)", "Discord Bots: https://discordbots.org/bot/232224611847241729/vote");
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
		return msg.channel.send(embed);
	}
};