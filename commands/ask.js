/* eslint-disable no-console */
const fn = require("./ask/main"),
	{ask} = require("../util/dialogflow");
const fe = require("../util/response_functions");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "ask",
	aliases: ["ask"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	desc: "Submits bug report on the bot. Report a bug or unexpected behaviour.",
	async exec(msg, cmd, args, doc) {
		msg.channel.startTyping();
		ask(msg, args.join(" "))
			.then(r => {
				msg.channel.stopTyping();
				if(r.type===1) return msg.channel.send(r.value);
				else fn(msg, args, doc, r);
			})
			.catch(err=>{
				msg.channel.stopTyping();
				fe.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** Unable to complete command due to generic error. Incident logged.");
			});
		// msg.channel.stopTyping();
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <your comment/report>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``);
		return msg.channel.send(embed);
	}
};

