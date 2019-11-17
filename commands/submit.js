const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const fn = require("./submit/main");

module.exports = {
	cmd: "submit",
	aliases: ["new"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Submit a new file to a library. Logo or templates.",
	async exec(msg, cmd, args, doc) {
		let type = args.shift();
		let tagsStart = args.findIndex(e => e.startsWith("-"));
		let sourceStart = args.indexOf("--source");

		if (sourceStart!==-1 && tagsStart > sourceStart) return msg.channel.send("**Could not complete command:** You need to switch place with source and tags. Tags come first.");
		
		let data = {
			name: args.slice(0, tagsStart).join(" "),
			allTags: args.slice(tagsStart, sourceStart<0?undefined:sourceStart).join(" ").split("-").filter(Boolean).map(e=>e.trim()),
			source: sourceStart>0?args.slice(sourceStart+1).join(" "):null,
			url: msg.attachments.size?msg.attachments.first().url:null,
			user: msg.author.id
		};

		switch(type) {
		case "logo":
		case "logos":
			if (args.length < 2) return msg.channel.send("**Missing arguments:** You must give the logo a name and some tags.");
			if (msg.attachments.size === 0) return msg.channel.send("**Missing input:** You must attach a SVG file along with the command.");
			if (!msg.attachments.first().url.endsWith(".svg")) return msg.channel.send("**Invalid input:** The attached file must be of type SVG.");
			return fn.logo(msg, data, doc);
		case "meme":
		case "memes":
			return fn.meme(msg, data, doc, args);
		// case "templates":
		// case "template":
		// case "templ":
		// 	return fn.template(msg, data, doc);
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <text>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} lorem ipsum\``);
		msg.channel.send(embed);
	}
};

