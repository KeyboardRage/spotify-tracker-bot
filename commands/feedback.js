/* eslint-disable no-console */
const {feedbackModel} = require("../util/database"),
	fn = require("../util/response_functions"),
	{counter_number} = require("../util/command-utilities");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const config = require("../data/config.json");

module.exports = {
	cmd: "feedback",
	aliases: ["suggestion","suggest"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc: "Submits feedback on the bot, or suggest a feature.",
	async exec(msg, cmd, args) {
		if (args.length != 0) {
			let message = args.join(" ");
			let num = await counter_number("feedbackNumber", msg);

			let feedback = new feedbackModel({
				_id: await num,
				msg: message,
				user: msg.author.id,
				when: Date(),
				feedbackType: "feedback"
			});
			feedback.save(err => {
				if (err) {
					console.error(`[${Date()}] bug → Error adding new bugreport from user ${msg.author.id}:`, err);
					fn.notifyErr(msg.client, err);
					msg.channel.send("An error occurred trying to submit bug report. Please try again at a later point in time.");
					throw err;
				} else {
					let chan = (msg.channel.type==="dm")?"**DM's**":`${msg.guild.name} \`${msg.guild.id}\``;
					message += `\n**From:** ${msg.author.tag} \`${msg.author.id}\` **in** ${chan}.`;
					fn.notify(msg.client, message, config.colors.green, "592832212693418006");
					return msg.channel.send(`\`ID: ${feedback._id}\` → Feedback submission successful.`);
				}
			});
		} else return msg.channel.send("**Missing argument:** You need to provide some text for the feedback submission.");
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <your comment/suggestion>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} make designer profiles\`\n\`${doc.prefix}${this.cmd} I love the bot! Good job!\`\n\`${doc.prefix}${this.cmd} would be nice to have a Pantone lookup tool\``)
		msg.channel.send(embed);
	}
};

