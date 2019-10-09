// https://lmgtfy.com/?q=something+adobe
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "lmgtfy",
	aliases: ["googlepls","plsgoogle","trygoogle","usegoogle"],
	cooldown: {min: 1},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: [""],
	desc: "Creates a basic 'Let Me Google That For You' link you can click.",
	exec(msg, cmd, args) {
		if (args.length === 0) return msg.channel.send("**Missing argument(s):** You need to provide something for me to make search link of.");

		return msg.channel.send("https://lmgtfy.com/?q="+args.join("+"));
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <what to search for>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} how to google\`\n\`${doc.prefix}${this.cmd} what is RGB\`\n\`${doc.prefix}${this.cmd} how to ask for help\``)
		msg.channel.send(embed);
	}
};