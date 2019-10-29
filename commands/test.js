const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
module.exports = {
	cmd: "test",
	aliases: ["testing"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Generic testing command. Replies with what you say.",
	async exec(msg) {
		console.log(ACCESS);
		msg.react("588844523204116501");
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
			.addField("Examples", `\`${doc.prefix}${this.cmd} lorem ipsum\``)
		msg.channel.send(embed);
	}
};
