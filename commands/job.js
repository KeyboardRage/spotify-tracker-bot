const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const fn = require("./job/main");

module.exports = {
	cmd: "job",
	aliases: ["jobs","work"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Make, modify, or perform actions on a job",
	async exec(msg, cmd, args, doc) {
		// The response for help on this command.
		if(!args.length) return fn.info.command(msg, args, doc);
		if(args[0] && args.length===1) return msg.channel.send("**Missing argument:** You must also tell me who the buyer is.");
		switch(args[0].toLowerCase()) {
		case "new":
			if(msg.channel.type==="dm") return msg.channel.send("**Denied:** This sub-command can only be used in guilds.");
			return fn.new(msg, args, doc);
		case "accept":
			return fn.accept(msg, args, doc);
		case "decline":
			return fn.decline(msg, args, doc);
		case "abort":
			return fn.abort(msg, args);
		}
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
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``);
		return msg.channel.send(embed);
	}
};