const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const {marketUserModel} = require("../util/database");
// const fn = require("../util/response_functions");
// const fe = require("../util/command-utilities");
// const Sentry = require("../util/extras");
const fn = require("./profiles/main");

module.exports = {
	cmd: "profile",
	aliases: ["user","users","profiles"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	desc: "Interact with profiles on Grafik",
	async exec(msg, cmd, args, doc) {
		if(!args.length) return fn.profile.find(msg, args, doc);
		switch(args[0]) {
		case "demo":
		case "yt":
		case "video":
			return msg.channel.send("**Profile demonstration:**\nhttps://www.youtube.com/watch?v=lV1E67XF4X8");
		case "list":
		case "users":
			return fn.profile.list(msg);
		case "cmds":
		case "commands":
		case "cmd":
		case "help":
			return fn.profile.cmds(msg, args, doc);
		case "social":
		case "socials":
		case "portfolio":
		case "portfolios":
			return msg.channel.send("**Socials / portfolios:**\n"+await fn.profile.social_list());
		case "edit":
			args.shift();
			marketUserModel.findById(msg.author.id, ["_id"], (err,user) => {
				if(err) return fn.profile.handleErr(err, msg);
				if(!user) return msg.channel.send("You don't have a profile. Register with `" + doc.prefix + "register`.");
				return fn.edit.edit(msg, args, doc);
			});
			break;
		case "unset":
		case "remove":
		case "delete":
			if (args[0].toLowerCase() === "unset" || args[0].toLowerCase() === "remove" || args[0].toLowerCase() === "delete"||args[0].toLowerCase() === "-") {
				args.shift();
				return fn.edit.edit_unset(msg, args, doc);
			} else return msg.channel.send("asd");
		case "set":
		case "add":
		case "new":
			if (args[0].toLowerCase() === "set" || args[0].toLowerCase() === "add" || args[0].toLowerCase() === "+") {
				args.shift();
				return fn.edit.edit_set(msg, args, doc);
			} else return msg.channel.send("asd");
		case "tags":
		case "types":
			args.shift();
			return fn.profile.show_types(msg, args, doc);
		case "search":
		case "find":
			return fn.profile.find(msg, args, doc, true);
		case "does":
			if(msg.channel.type==="dm") return msg.channel.send("**Cannot use command:** This sub-command is only available in guilds, as it searches for users in the guild that does one of the types of work.");
			return fn.profile.tags(msg, args, doc);
		case "register":
		case "setup":
			return msg.client.commands.register.exec(msg, cmd, args, doc);
		case "field":
		case "fields":
		case "creative":
		case "creatives":
		case "creative-field":
		case "creative-fields":
			return msg.channel.send(await fn.profile.creative_fields(msg, doc));
		case "info":
			args.shift();
			return fn.info.main(msg, args, doc);
		default:
			return fn.profile.find(msg, args, doc);
		}
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("user", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <id|mention|username|tag|[option]>\``)
			.addField("Flags", "`--or` when searching by tags to make multiple tags 'or' instead of 'and'.")
			.addField("Examples", `\`${doc.prefix}${this.cmd} cmds\`\n\`${doc.prefix}${this.cmd} VirtusGraphics\`\n\`${doc.prefix}${this.cmd} edit\`\n\`${doc.prefix}${this.cmd} search 164736401051484160\`\n`);
		msg.channel.send(embed);
	}
};