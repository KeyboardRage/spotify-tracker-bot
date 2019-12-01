/* eslint-disable no-console */
const {feedbackModel} = require("../util/database"),
	fn = require("../util/response_functions"),
	{counter_number} = require("../util/command-utilities");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const config = require("../data/config.json");
module.exports = {
	cmd: "bug",
	aliases: ["report"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	desc: "Submits bug report on the bot. Report a bug or unexpected behaviour.",
	longDesc: "TEXT",
	examples: ["bug bot starts typing then never say anything", "bug taking 10 seconds to respond", "bug color command says API gave error"],
	flags: [],
	group: 2,
	meta: [],
	syntax:"bug <your message>",
	async exec(msg, cmd, args) {
		if(args.length != 0) {
			let message = args.join(" ");
			let num = await counter_number("feedbackNumber", msg);

			let feedback = new feedbackModel({
				_id: await num,
				msg: message,
				user: msg.author.id,
				when: Date(),
				feedbackType: "bug"
			});

			feedback.save(err => {
				if (err) {
					console.error(`[${Date()}] bug → Error adding new bugreport from user ${msg.author.id} ${msg.author.tag}:`, err);
					fn.notifyErr(msg.client, err);
					msg.channel.send("An error occurred trying to submit bug report. Please try again at a later point in time.");
					throw err;
				} else {
					fn.notify(msg.client, message, config.colors.red, "586135924069367808");
					return msg.channel.send(`\`ID: ${feedback._id}\` → Bug report successful.`);
				}
			});
		} else return msg.channel.send("**Missing argument:** You need to provide some text for the bug report.");
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
			.addField("Examples", `\`${doc.prefix}${this.cmd} bot starts typing then never say anything\`\n\`${doc.prefix}${this.cmd} taking 10 seconds to respond\`\n\`${doc.prefix}${this.cmd} color command gives some sort of error\``)
		return msg.channel.send(embed);
	}
};

