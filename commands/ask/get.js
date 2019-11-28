module.exports = _main;
const Discord = require("discord.js");

function _embed(msg, prefix) {
	return new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(`${prefix}ask — Smart FAQ reply to ${msg.author.tag}`, msg.author.avatarURL);
}

async function _main(msg, args, doc, r) {
	switch(r.value.value) {
	case "prefix":
		return getPrefix(msg, args, doc);
	default:
		return msg.channel.send("I do not have an answer for that.");
	}
}

async function getPrefix(msg, args, doc) {
	const embed = _embed(msg, doc.prefix);
	if(msg.channel.type==="dm") {
		embed.addField("Prefixes", "Prefix in DM's is always `+`.\nAsk me in a guild if you want to know my prefix there.\nYou can also @me instead of using prefix in DM and in guilds.");
	} else {
		embed.addField("Prefixes", `The prefix in this guild is \`${doc.prefix}\`.\nPrefix in DM's is always \`+\`.\nYou can also @me instead of using prefix in DM and in guilds.`);
		embed.addField("Prefix commands", `Get prefix: \`${doc.prefix}settings prefix\`\nSet prefix: \`${doc.prefix}settings prefix <new prefix>\``);
	}
	return msg.channel.send(embed);
}