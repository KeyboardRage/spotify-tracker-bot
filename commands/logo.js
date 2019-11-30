const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const retry = require("retry");
const {logoModel} = require("../util/database");
const {RedisDB} = require("../util/redis");
const {restartWhenReady} = require("../util/session");
const request = require("request");
const fn = require("../util/response_functions");
const {sendAndAwait} = require("../util/command-utilities");

module.exports = {
	cmd: "logo",
	aliases: ["logos"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	desc: "Search for company, service, item logos.",
	async exec(msg, cmd, args, doc) {
		// TODO: Only search.
		if(!args.length) return msg.channel.send("**Missing arguments:** You must give the logo a name or some tags to search for.");
		return search(msg, args, doc);
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <search term(s)>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} discord\`\n\`${doc.prefix}${this.cmd} grafik\``);
		msg.channel.send(embed);
	}
};

async function handleErr(err, msg, reply=null) {
	if(err.size && err.size===0) {
		msg.channel.send("**Aborted:** Time ran out.");
		return;
	} else {
		msg.channel.send(reply?reply:"**Error:** A generic error occurred. Incident has been logged.");
		return fn.notifyErr(err, msg);
	}
}

async function search(msg, args) {
	if (args.length > 5) return msg.channel.send("**Invalid argument(s):** Maximum amount of tags for search is five.");
	
	logoModel.find({tags:{$in:args}}, (err,docs) => {
		if(err) return handleErr(err, msg, "**Error:** An error occurred trying to query database.");
		if (!docs.length) return msg.channel.send("<:Info:588844523052859392> No logos found matching `"+args.join("`, `")+"`.");

		else if (docs.length>1) {
			// Multiple logos found.
			let response = "<:Info:588844523052859392> Multiple matches:";
			for (let i = 0; i < docs.length; i++) {
				response += `\n\`${i}\` ${docs[i].name} *(v ${docs[i].version})*`;
				if (i === 10) break; //TODO: Do some kind of "there are more results";
			}
			response += "\n\n**Reply with** the corresponding number to get.";
			sendAndAwait(msg, response)
				.then(r => {
					if (isNaN(r)) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** Not a valid number.");
					try {
						r = parseInt(r);
					} catch (err) {
						return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** Not a valid number.");
					}
					let doc = docs[r].toObject();
					const embed = new Discord.RichEmbed()
						.setTimestamp(Date())
						.setColor(process.env.THEME)
						.setFooter(msg.author.tag, msg.author.avatarURL)
						.setDescription(`Logo: **${doc.name}**`)
						.addField("**Information:**", `**Name:** ${doc.name}\n**ID:** ${doc._id}\n**Version:** ${doc.version}\n**Last updated:** ${doc.last_updated}`, true)
						.addField("**Tags:**", `${doc.tags.join(", ")}`, true)
						.addField("**Contributors:**", `<@${doc.contributors.join(">, <@")}>`, true)
						.addField("**Downloads:**", `[SVG – Vector](https://grafik-bot.net/logos/${doc.download.svg}) | [PNG – Bitmap](https://grafik-bot.net/logos/${doc.download.png})`, true);
					if (doc.notes) embed.addField("**Notes:**", `- ${doc.notes.join("\n- ")}`);
					return msg.channel.send(embed);
				}).catch(err => {
					return handleErr(err, msg);
				});
		} else {
			// Found exactly 1 match.
			let doc = docs[0].toObject();
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription(`Logo: **${doc.name}**`)
				.addField("**Information:**", `**Name:** ${doc.name}\n**ID:** ${doc._id}\n**Version:** ${doc.version}\n**Last updated:** ${doc.last_updated}`, true)
				.addField("**Tags:**", `${doc.tags.join(", ")}`, true)
				.addField("**Contributors:**", `<@${doc.contributors.join(">, <@")}>`, true)
				.addField("**Downloads:**", `[SVG – Vector](https://grafik-bot.net/logos/${doc.download.svg}) | [PNG – Bitmap](https://grafik-bot.net/logos/${doc.download.png})`, true);
			if (doc.notes) embed.addField("**Notes:**", `- ${doc.notes.join("\n- ")}`);
			msg.channel.send(embed).catch(err => {
				return handleErr(err, msg);
			});
		}
	});
}