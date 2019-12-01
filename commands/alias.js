const {alias} = require("../util/command-utilities");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "alias",
	aliases: ["aliases"],
	cooldown: {min: 3},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Finds aliases and non-alias of given command.",
	longDesc: "Long desc",
	examples: ["alias alias", "alias settings", "alias watermark"],
	flags: [],
	group: 2,
	meta: [],
	syntax: "alias <command or alias>",
	exec(msg, cmd, args) {
		// Check if even anything to check.
		if(args[0] === undefined) return msg.channel.send("**Invalid argument:** Missing a command/alias to check. Correct usage is `+alias <alias or cmd>`.");

		args[0] = args[0].toLowerCase();
		if(args[0].length > 29) return msg.channel.send("**Invalid argument:** There's definitely no command or alias that long.");

		let realCmd = alias(msg.client.commands, args[0]);
		if (realCmd === null) return msg.channel.send(`**Invalid argument:** Could not find any command with the alias \`${args[0]}\`.`);
		
		let aliasList = msg.client.commands[realCmd].aliases.join("`, `");
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Non-alias", `\`${realCmd}\``, true)
			.addField("Aliases", `\`${aliasList}\``, true);
		return msg.channel.send(embed);
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd))?null:this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}alias <command or alias>\``)
			.addField("Examples", `\`${doc.prefix}alias alias\`\n\`${doc.prefix}alias settings\`\n\`${doc.prefix}alias watermark\``)
		return msg.channel.send(embed);
	}
};