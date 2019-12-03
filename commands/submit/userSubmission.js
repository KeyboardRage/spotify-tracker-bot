const {userSubmissionModel} = require("../../util/database");
const mongoose = require("mongoose");
const config = require("./config.json");
const fn = require("../../util/response_functions");
const Discord = require("discord.js");

module.exports = main;
async function main(msg, doc, data) {
	try {
		let submission = new userSubmissionModel({
			_id: new mongoose.mongo.ObjectId(),
			user: data.user,
			content: data.content,
			attachments: data.attachments,
			library: config.libs_map[data.type],
			flags: 0,
			guild: msg.channel.type==="dm"?"DM":`${msg.guild.id}`
		});
		submission.save({omitUndefined:true}, (err,_doc) => {
			if(err) {
				fn.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** An error occurred trying to save the submission. Incident reported.");
			}

			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField("New community contribution", "**Submission ID:** `"+_doc._id+"`\
				\n**Library:** "+config.libs[_doc.library]+"\
				\nThank you! The developer was notified of your contribution.\nYou'll be notified through DM once it's been reviewed.");

			const _embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField("New community contribution", "**Submission ID:** `" + _doc._id + "`\
			\n**Library:** " + config.libs[_doc.library] + "\
			\n**User:** `"+msg.author.id+"` "+msg.author.tag);
			if(msg.channel.type!=="dm") _embed.addField("Guild", `\`${msg.guild.id}\` ${msg.guild.tag}`);
			_embed.addField("Content", `${_doc.content?_doc.content:"None."}`)
				.addField("Attachments", `${_doc.attachments.length ? _doc.attachments.join("\n") :"None."}`);

			let sent=0;
			msg.client.guilds
				.get("575439977736044585")
				.channels
				.get("651525518990245922")
				.send(_embed)
				.then(()=>{
					sent=1;
					return msg.channel.send(embed);
				})
				.catch(err=>{
					if(!sent) msg.channel.send(embed).catch(()=>{return;});

					if(err.code && [50013,50007].includes(err.code)) return;
					else return fn.notifyErr(msg.client, err);
				});
		});
	} catch(err) {
		fn.notifyErr(msg.client, err);
		return msg.channel.send("**Error:** A generic error occurred. Incident logged.");
	}
}