const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const {marketUserModel} = require("../util/database");
const types = require("../data/config.json").market.creator_types;
const portfolios = require("../data/config.json").market.portfolios;
const fn = require("../util/response_functions");

module.exports = {
	cmd: "profile",
	aliases: ["profile"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Show a user's Grafik profile",
	async exec(msg, cmd, args, doc) {
		if(!args.length) return find(msg, args, doc);
		switch(args[0]) {
		case "cmds":
		case "commands":
		case "cmd":
			return cmds(msg, args, doc);
		case "edit":
			return edit(msg, args, doc);
		case "search":
		case "find":
			return find(msg, args, doc, true);
		case "register":
			return msg.client.commands.register.exec(msg, cmd, args, doc);
		default:
			return find(msg, args, doc);
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
			.addField("Examples", `\`${doc.prefix}${this.cmd} cmds\`\n\`${doc.prefix}${this.cmd} VirtusGraphics\`\n\`${doc.prefix}${this.cmd} edit\`\n\`${doc.prefix}${this.cmd} search 164736401051484160\`\n`);
		msg.channel.send(embed);
	}
};


async function handleErr(err, msg) {
	msg.channel.send("**Could not complete command:** An error ocurred. The error has been reported.");
	fn.notifyErr(msg.client, err);
	return;
}

async function create_embed(msg, user, self=false) {
	return new Promise(resolve => {
		let title = String();
		if (user.meta.main_type === 6) {
			title = (user.meta.company_url) ? `Works at [${user.meta.company}](${user.meta.company_url})` : "Works at " + user.meta.company;
		} else if (user.meta.main_type === 5) title = "Private person";
		else title = types[user.meta.main_type.toString()].name;

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setDescription((self)?"Your own profile":"Profile of <@"+user._id+">")
			.addField((self)?"About you":"About "+user.name, `**Name:** ${user.name}\n**Discord:** ${user.meta.discord}#${user.meta.discriminator}\n**Discord ID:** ${user._id}`, true)
			.addField("\u200B", `**Title:** ${title}`, true);
		if (user.meta.main_type <= 4) {
			let socials = String();
			for (let elm in user.portfolios) {
				if (elm == "1") socials += `[Personal site →](${user.portfolios[elm]}) \n`;
				else if (elm == "8") socials += `[Facebook page →]($${user.portfolios[elm]})\n`;
				else if (portfolios[elm].need_url_prefix) socials += `**${portfolios[elm].name}**: [${portfolios[elm].prefix}${user.portfolios[elm]}](${portfolios[elm].url_prefix}${user.portfolios[elm]})\n`;
				else socials += `**${portfolios[elm].name}**: ${portfolios[elm].prefix}${user.portfolios[elm]}\n`;
			}
			embed.addField("Status", `**Availability:** ${(user.meta.available)?"open for comissions.":"not open for comissions."}\n${(user.meta.tags)?"**User works with:**\n"+user.meta.tags.join(", "):""}`)
				.addField("Portfolio and social media", socials);
		}
		return resolve(embed);
	});
}

async function find(msg, args, doc, search=false) {
	if(search) args.shift();
	if (!args.length) {
		marketUserModel.findById(msg.author.id, async (err, user) => {
			if (err) return handleErr(err, msg);
			if (!user) return msg.channel.send("You don't have a profile. Register with `" + doc.prefix + "register`.");
			if (user) {
				let embed = await create_embed(msg, user.toObject(), true);
				return msg.channel.send(embed);
			}
		});
	} else {
		let not_guild_member = false,
			user,
			dm = (msg.channel.type === "dm");
		// Only possible if in guild
		if(!dm) {
			user = msg.guild.members.find(u => u.user.id == args[0]);
			if (!user) user = msg.mentions.members.first() || msg.guild.members.find(u => u.user.tag.toLowerCase() == args.join(" ").toLowerCase()) || msg.guild.members.find(u => u.user.username.toLowerCase() == args.join(" ").toLowerCase());
			user = (user) ? user.id : null;
		}

		if (!user) {
			if (args[0].match(/[0-9]+/)) {
				not_guild_member = true;
				user = args[0].match(/[0-9]+/)[0];
			} else if (dm) {
				return msg.channel.send("**Invalid argument:** While in DM, you may only search by user ID's. To search user names, tags, and mentions, you must be in the guild you wish to search.");
			}
		}
		marketUserModel.findById(user, async (err, user) => {
			if (err) return handleErr(err, msg);
			if (!user) return msg.channel.send(`Could not find user ${(not_guild_member)?"in this guild nor globally.":"in this guild. You could try the Discord ID to search globally."}`);
			let embed = await create_embed(msg, user.toObject());
			return msg.channel.send(embed);
		});
	}
}


async function cmds(msg, args, doc) {
	// Something
	let string = `•    \`${doc.prefix}profile\` get your own profile, if you've registered.\
	\n•    \`${doc.prefix}profile cmds\` lists available commands *(this very message)*.\
	\n•    \`${doc.prefix}profile edit\` initialize profile editor in DM.\
	\n•    \`${doc.prefix}profile <id|mention|username|tag>\` search for user in this guild by ID, mention, username, or tag. Use ID for global search outside guild.\
	\n•    \`${doc.prefix}profile search <id|mention|username|tag>\` same as above, except for cases where name would be same as a sub-command.\
	\n•    \`${doc.prefix}profile register\` alias of the command \`${doc.prefix}register\`.`;
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.addField("Available sub-commands", string);
	return msg.channel.send(embed);
}
async function edit(msg, args, doc) {
	// Something
	return msg.channel.send("Sub-command not yet completed.");
}

/**
 * OLD SHIT.
 * 
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