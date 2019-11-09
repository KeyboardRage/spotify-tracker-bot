const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const retry = require("retry");
const {marketUserModel,userTags} = require("../util/database");
const {RedisDB} = require("../util/redis");
const {restartWhenReady} = require("../util/session");
const request = require("request");

module.exports = {
	cmd: "logo",
	aliases: ["logos"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Search for company, service, item logos.",
	async exec(msg, cmd, args) {
		let url = (process.env.DEBUG==="true")?"https://localhost:5000/v1/logo":process.env.NEW_API+"/v1/logo";

		// TODO: Only search.
		if(args.length<2) return msg.channel.send("**Missing arguments:** You must give the logo a name and some tags.");

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
			.addField("Examples", `\`${doc.prefix}${this.cmd} lorem ipsum\``);
		msg.channel.send(embed);
	}
};
