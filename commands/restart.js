const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const {restartWhenReady} = require("../util/session");
const {exec} = require("child_process");
const fn = require("../util/response_functions");

module.exports = {
	cmd: "restart",
	aliases: ["rs"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Schedule bot for restart. Optionally also pull from git along with restart.",
	async exec(msg, cmd, args) {
		msg.channel.send(`<:Info:588844523052859392> **Restarting:** Bot has been queued for restart${args.includes("--git")?" and Git update":""}...`);
		restartWhenReady(msg.client, err => {
			if (err) {
				fn.notifErr(msg.client, err);
				return msg.channel.send(err.toString);
			}
			else if (args.includes("--git")) return msg.client.commands["gitupdate"].exec(msg, cmd, args);
			else {
				exec("forever restart 0", (err, stdout, stderr) => {
					if (err) throw err;
					if (stderr) {
						console.log("Restart stderr:");
						console.log(stderr);
					}
					console.log(stdout);
				});
			}
		});
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} ['--git']\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} --git\`\n\`${doc.prefix}${this.cmd}\``);
		msg.channel.send(embed);
	}
};