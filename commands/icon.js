const ACCESS = require("../data/permissions.json");
const request = require("request-promise-native");
const Discord = require("discord.js");
const jimp = require("jimp");
const sharp = require("sharp");

module.exports = {
	cmd: "icon",
	aliases: ["icons"],
	cooldown: {min: 8},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Searches for icons on The Noun Project.",
	async exec(msg, cmd, args, doc) {
		if(!args.length) return msg.channel.send(`**Missing input:** You must give me keyword(s) to search for: \`${doc.prefix}icon <keyword(s)> ["--all"]\``);
		
		// Set meta
		let meta = {all:false, page:1, stop:false};
		if(args.includes("--all")) {
			meta.all = true;
			args.splice(args.indexOf("--all"), 1);
		}

		// Sanitation
		args = args.join(" ").replace(/[^a-z0-9- ]/ig, "");
		if(!args.length) return msg.channel.send("**Invalid argument(s):** There was nothing left of your input after sanitation. Stick to characters A to Z, space, hyphen, and numbers 0 to 9.");
		msg.channel.send(`<:Ellipsis:588844515461300448> **Searching** for '${args}' with ${(meta.all)?"any license":"public domain license"}…`)
			.then(async message => {
				// Fetching from API
				msg.channel.startTyping();
				let res;
				try {
					res = await request(`${process.env.NEW_API}${process.env.API_VERSION}/icon?icon=${args}&cc0=${!meta.all}&page=1`, {json:true, timeout:5000});
					if(typeof(res) === "string") {
						res = JSON.parse(res);
					}
				} catch(err) {
					console.error(err);
					msg.channel.stopTyping();
					throw err;
				}

				if (res.hasOwnProperty("err") && res.err) {
					meta.stop = true;
					msg.channel.stopTyping();
					return message.edit(res.msg);
				}
				res.meta = meta;
				res.meta.author_id = msg.author.id;
				res.meta.author_url = msg.author.avatarURL;
				res.meta.author_tag = msg.author.tag;

				msg.channel.stopTyping();
				return action(message, res, "init");
			})
			.catch(err => {
				msg.channel.stopTyping();
				msg.channel.send("**Error:** Something went wrong during this operation. Incident has been reported.");
				throw err;
			});
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <search term(s)> ["--all"]\``)
			.addField("Valid arguments", "Result shows first 20 icon results.\nThe `--all` flag *includes* results that aren't necessarily licensed as CC0 *(public domain)*.")
			.addField("Examples", `\`${doc.prefix}${this.cmd} boat --all\`\n\`${doc.prefix}${this.cmd} phone\`\n\`${doc.prefix}${this.cmd} tree --all\``);
		return msg.channel.send(embed);
	}
};

async function loop(message, data, content, callback) {
	let options = {maxMatches: 1,time: 60000,errors:["time"]};
	let filter = m => {
		if (m.author.id === data.meta.author_id) {
			m.content=m.content.toLowerCase();
			if(m.content ==="d" || (!isNaN(m.content))) return true;
			else return false;
		} else return false;
	};
	if(content===null) {
		message.channel.awaitMessages(filter, options)
			.then(collected => {
				let content = collected.first().content;
				collected.first().delete(); // Remove author's msg
				return callback(message, data, content);
			})
			.catch(err => {
				if (err.size === 0) {
					//TODO: Is this valid?
					content.fields = [];
					message.edit("**Time expired.**", content);
				} else {
					throw err; //TODO: Handle.
				}
			});
	} else {
		message.edit(content)
			.then(message => {
				return message.channel.awaitMessages(filter, options);
			})
			.then(collected => {
				let content = collected.first().content;
				collected.first().delete(); // Remove author's msg
				return callback(message, data, content);
			})
			.catch(err => {
				if(err.size===0) {
					//TODO: Is this valid?
					content.fields = [];
					message.edit("**Time expired.**", content);
					return;
				} else {
					message.channel.send("**Error:** Something went wrong. Was my message deleted? :thinking:");
					throw err; //TODO: Handle.
				}
			});
	}
}

async function action(message, data, reply) {
	if(reply==="init") {
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setTitle(`${(data.meta.all)?"Any use":"Commercial use"} icons: ${data.keyword}`)
			.setFooter(data.meta.author_tag, data.meta.author_url)
			.addField("Pick an icon", "Reply with an icon number to get")
			.setDescription(`See [search on website instead →](https://thenounproject.com/search/?q=${data.keyword})`)
			.setImage(data.image);
		return loop(message, data, embed, action);
	} else if(!isNaN(reply) && parseInt(reply)>Object.keys(data.iconMap).length) {
		message.channel.send(`**Invalid input:** There's only ${Object.keys(data.iconMap).length} icon results you can pick from.\nYou may be able to get more results on the site: https://thenounproject.com/search/?q=${data.keyword}`);
		return loop(message, data, null, action);
	} else if (!isNaN(reply)) {
		try {
			reply = parseInt(reply)-1;
			let icon = await jimp.read(data.iconMap["icon_"+reply].image)
				.then(image => {
					return image
						.getBufferAsync(jimp.MIME_PNG);
				}).catch(err => {throw err;});
			let preview = await sharp({
				create: {
					width:100,
					height:100,
					channels: 3,
					background: {r:255,g:255,b:255}
				}
			}).composite([{input:icon}]).png().toBuffer();

			const imageAttachment = new Discord.Attachment(preview, `icon_${reply}.png`);
			// console.log(imageAttachment, `attachment://icon_${reply}.png`);
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setTitle(`${(data.meta.all) ? "Any use" : "Commercial use"} icon: ${data.keyword}`)
				.setAuthor(`Icon ID: ${data.iconMap["icon_"+reply].id}`, data.meta.author_url, `https://thenounproject.com${data.iconMap["icon_"+reply].permalink}`)
				.attachFile(imageAttachment)
				.setThumbnail(`attachment://icon_${reply}.png`)
				.setFooter(data.meta.author_tag, data.meta.author_url)
				.addField("License:", checkLicense(data, `icon_${reply}`).reply, true)
				.addField("Credits:", checkLicense(data, `icon_${reply}`).credits, true)
				.addField("Download:", `[SVG](${data.iconMap["icon_"+reply].urlSvg}) | [PNG](${data.iconMap[`icon_${reply}`].urlPng})`, false);
			message.delete();
			return message.channel.send(embed);
		}catch (err) {
			console.error(err);
			return message.edit("**Error:** An error ocurred trying to do that.");
		}
	} else {
		return message.delete();
	}
}

function checkLicense(body, iconNumber) {
	switch(body.iconMap[iconNumber].license) {
	case "public-domain":
		return {credits:body.iconMap[iconNumber].attribution,reply:"**CC0**. License is public domain, and you do not need to credit the creator."};
	case "creative-commons-attribution":
		return {credits:body.iconMap[iconNumber].attribution,reply:"**CCBY**. You are **required** to credit the creator. Use the content in \"Credits\". You may also have to go through The Noun Project's site for SVG, through the `Icon ID: #` at the top."};
	default:
		return {credits:body.iconMap[iconNumber].attribution,reply:"**Unknown**. You should click on the `Icon ID: #` and check what license this icon use yourself."};
	}
}