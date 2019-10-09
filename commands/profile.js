const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const request = require("request-promise-native");
const fn = require("../util/command-utilities");
const {marketUserModel} = require("../util/database");

module.exports = {
	cmd: "profile",
	aliases: ["profile"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Show a user's Grafik profile",
	async exec(msg, cmd, args) {
		if(args[0]===undefined) {
			//TODO: Get own profile
			return;
		}
		msg.channel.startTyping();
		let user = await fn.findUser(msg, args[0]);
		request.post(`${process.env.NEW_API}${process.env.API_VERSION}/profile`, {formData:{
			id:(user)?user.id:null,
			name:(user)?user.username:args[0],
			avatar:(user)?user.avatarURL:null
		}});
		/**
		 * If some data is null, try to search for the name in DB.
		 * If nothing found, return not found.
		 * If found, check "last_updated" in DB and check is a cache image exist on that UID_DATE:
		 * 		- if found, does it match?
		 * 			yes:
		 * 				-	Send that profile
		 * 			no:
		 * 				-	Generate new profile
		 * 				- 	Send that profile
		 * 		- if not found
		 *			- Generate new profile
		 *			- Send that profile
		 */
		
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
