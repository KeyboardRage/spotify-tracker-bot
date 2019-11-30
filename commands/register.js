const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const fn = require("./profiles/main");

module.exports = {
	cmd: "register",
	aliases: ["register"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc: "Register as a designer / buyer and set up a profile.",
	async exec(msg, cmd, args, doc) {
		return fn.register(msg, doc);
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
			.addField("What is it for?", "Profiles allow users to find a user's social media, portfolio, contact info, and availability status without the need of the user to be present. In the future, profiles will have profil cards, track sales/purchases *(which is why 'buyers' can register too)*, disputes, commissions open, and more — across and isolated to guilds.");
		msg.channel.send(embed);
	}
};
