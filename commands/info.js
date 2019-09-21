const {bot_invite} = require("../data/config.json");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "info",
	aliases: ["information"],
	cooldown: {min: 3},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Gives brief general information regarding the bot.",
	exec(msg, cmd, args, doc) {
		if(args[0]!=="premium") {
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField("Creator", "<@164736401051484160>", true)
				.addField("Support", "[Join server](https://discord.gg/UBuPHFd)", true)
				.addField("Target audience", "Guilds with designers,\ncreatives, and artists,\nmarket guilds", true)
				.addField("Prefix", `Current: \`${doc.prefix}\`\nDefault *(and DM)*: \`${process.env.PREFIX}\``, true)
				.addField("Help", `List commands with \`${doc.prefix}help\`, \nand about the command with \`${doc.prefix}<command> ?\``, true)
				.addField("Premium", `${(msg.channel.type==="dm")?"Not applicable in DM.":(doc.premium)?"Yes.":"No."} — \`${doc.prefix}info premium\` \nfor more information.`, true)
				.addField("Configure", `Use \`${doc.prefix}init\` to start helper for \nchanging settings for the current guild.`, true)
				.addField("Feedback / bugs", `Report bugs or give feedback \nwith \`${doc.prefix}<"bug"|"feedback"> <message>\`.`, true)
				.addField("Invite", `[Click here](${bot_invite}) to add Grafik to your guild.`);
			return msg.channel.send(embed);
		} else {
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField("About premium", "In order to keep the bot self-sustainable for various \
				technical services, a few features are be locked behind a paywall. Things that would \
				require some sort of storage are most likely to be a premium feature.")
				.addField("Price", "For now, the price for preimum features are subscription based, and are **$2 USD** per month. \
				Prices and/or payment system may change in the future, but I'll try to let the early supporters keep their current \
				if it's more beneficial for them, until they cancel.")
				.addField("Premium features", "Many of the complex features will be premium. Features \
				may be moved \"in and out of premium\". Here's a list of current premium features/commands:\
				\n• `form` Form builder command")
				.addField("How access works", "The subscription follow the person, and the person would enable premium for a guild of their choice.\
				Once activated for a guild, it'll be locked for that guild for a month. If you want to change guild it's activated for, \
				use a command *(to be made)* that queue the change to happen once the month is up. The month follows the payment cycle, \
				not the activation/change cycle. If you lose access to your Discord account, join support guild and prepare information of payment(s).")
				.addField("Obtaining premium", "As of right now, premium is not yet public due to website not \
				being done and no automated payment system existing yet. If you're interested nontheless, \
				you could DM <@164736401051484160> and ask — payments and premium activation have to be handeled manually for now.")
				.addField("What does the money go to?", "While it'd be nice to get paid for the labor of basically soloing the development\
				*(got no co-developers yet)*, the current concern is first and foremost making the bills for keeping the bot pay itself, as mentioned.\
				Maybe on occasion, if there's a good buffer, I can cash out enough for an energy drink and spend a night making some more stuff for the bot 😘")
			return msg.channel.send(embed);
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