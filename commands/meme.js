const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const {memesModel} = require("../util/database");
const fn = require("../util/response_functions");

module.exports = {
	cmd: "meme",
	aliases: ["memes"],
	cooldown: {min: 2},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc: "Post random design/art related memes, meme by ID, or random meme by keyword.",
	async exec(msg, cmd, args) {
		// The response for help on this command.
		//TODO: '--info' to also get all available information embedded in the result 
		if(!args.length) return random(msg);
		if(isNaN(args[1])) return byTag(msg, args);
		return byId(msg, parseInt(args[1]));
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

async function random(msg) {
	memesModel.aggregate([{$sample:{size:1}},{$project:{url:1,_id:1}}], (err,doc) => {
		if(err) return handleErr(err, msg, "<:Stop:588844523832999936> **Error:** Unable to query database for relateable memes.");
		if(!doc.length) return msg.channel.send("**Not found:** Could not find any memes at all.");
		console.log(doc);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(`Meme ID: ${doc[0]._id}`, msg.author.avatarURL)
			.setDescription("Random meme")
			.setImage(`https://grafik-bot.net/memes/${doc[0].url}`);
		msg.channel.send(embed);
	});
}

async function byTag(msg, args) {
	memesModel.aggregate([
		{$match: {"tags": {$in: args.slice(0,5)}}},
		{$sample: {size:1}},
		{$project:{url:1,_id:1}}], (err,doc) => {

		if (err) return handleErr(err, msg, "<:Stop:588844523832999936> **Error:** Unable to query database for relateable memes.");
		if (!doc.length) return msg.channel.send("**Not found:** Could not find a random meme by the tag(s) `" + args.slice(0, 5).join("`, `") + "`.");

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(`Meme ID: ${doc[0]._id} | Tags: ${doc[0].tags.join(", ")}`, msg.author.avatarURL)
			.setDescription("Random meme by tag(s)")
			.setImage(`https://grafik-bot.net/memes/${doc[0].url}`);
		msg.channel.send(embed);
	});
}

async function byId(msg, id) {
	memesModel.findOne({_id:id}, ["url","_id"], (err,doc) => {
		if(err) return handleErr(err, msg, "<:Stop:588844523832999936> **Error:** Unable to query database for relateable memes.");
		if(!doc) return msg.channel.send("**Not found:** Could not find a meme by the ID `"+id+"`.");
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(`Meme ID: ${doc._id}`, msg.author.avatarURL)
			.setDescription(`Meme by ID ${doc._id}`)
			.setImage(`https://grafik-bot.net/memes/${doc.url}`);
		msg.channel.send(embed);
	});
}

async function handleErr(err, msg, reply = false) {
	console.error(err);
	reply = reply ? reply : "**Error:** A generic error occurred trying to submit. Incident logged.";
	fn.notifyErr(msg.client, err);
	return msg.channel.send(reply);
}