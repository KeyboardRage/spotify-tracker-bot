const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const fn = require("../util/command-utilities");
module.exports = {
	cmd: "help",
	aliases: ["commands"],
	cooldown: {min: 2},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Lists all commands you have access to or gets information on commands.",
	exec(msg, cmd, args, doc) {
		// The response for help on this command.
		if(args.length) {
			let c = fn.alias(msg.client.commands, args[0]);
			if (!c) return msg.channel.send("**<:Stop:588844523832999936> Invalid input:** That command/alias does not exist.");
			return msg.client.commands[c].help(msg, c, args, doc);
		}

		let availableCmds = String();
		for (let command in msg.client.commands)  {
			if (msg.client.commands[command].permissionLevel & doc.level.userLevel) availableCmds += `\n• ${command}`;
		}

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Help", `To get help on a command, what it does, and syntax, put \`?\` as the first argument of any command, or \`${doc.prefix}help <command>\`.\n**Examples:**\n\`${doc.prefix}alias ?\`\n\`${doc.prefix}help alias\`.`)
			.addField("Commands available to you:", availableCmds)
			.addField("More information", "For more information about commands, syntax, and the bot in general, visit https://static.grafik-bot.net");
		msg.channel.send(embed);
		msg.channel.stopTyping();
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} [command to look in to]\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd}\`\n\`${doc.prefix}${this.cmd} help\`\n\`${doc.prefix}${this.cmd} watermark\``);
		msg.channel.send(embed);
	}
};