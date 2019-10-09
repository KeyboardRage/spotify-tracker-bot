const request = require("request"),
	sharp = require("sharp");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
const fn = require("../util/response_functions");
module.exports = {
	cmd: "contrast",
	aliases: ["check","webaim"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: ["ATTACH_FILES", "EMBED_LINKS"],
	desc: "Checks the contrast between two given colors.",
	exec(msg, cmd, args, doc) {
		if(args[0] === "info") {
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setTitle("Information regarding contrast")
				.addField("The test", "Using a serie of calculations, the two colors you gave get their percieved \"luminance\" tested to see if they provide a good contrast between each other, for example if one is background color and the other is text color.")
				.addField("Normal text:", `Normal text is considered to be 14 point *(~18.7px)* non-bold and lower point size. There's two levels of tests. *Basically* the visible, and the *very* visible.`)
				.addField("Large text:", `Large text is 14 point in bold or larger point size.`)
				.addField("Graphical", "This is for objects like borders on inputs, and other general user interface components.\n\nFor full specs on Web Accessability, read [WC3's document here](http://www.w3.org/TR/WCAG20/).")
			return msg.channel.send(embed);
		}

		if(args.length === 0) return msg.channel.send("**Missing arguments:** You need to pass two colours that will be compared.");
		if(args.length === 1) return msg.channel.send("**Missing argument:** You need to pass another colour to compare the first one to!");
		
		msg.channel.startTyping();
		request.get(`${process.env.NEW_API}${process.env.API_VERSION}/contrast?colorA=${args[0].replace("#","")}&colorB=${args[1].replace("#","")}`, {encoding: "utf8"}, async (err, res, body) => {
			if(err) {
				msg.channel.send("**Error:** Something went wrong contacting my API. Incident has been reported.");
				msg.channel.stopTyping();
				throw err;
			}
			if(res.statusCode!==200) {
				fn.notifyErr(msg.client, new Error("Contrast checker → request.statusCode: " + res.statusCode));
				msg.channel.stopTyping();
				return msg.channel.send("**Error:** The API responded with the wrong status code. Incident has been reported.");
			}
			
			try {
				body = JSON.parse(body);
			} catch {}

			if (body.err) {
				msg.channel.stopTyping();
				return msg.channel.send(body.msg);
			}
			const half = await sharp({
				create: {
					width:50,
					height:50,
					channels: 3,
					background:{
						r: body.data.colorB.r,
						g: body.data.colorB.g,
						b: body.data.colorB.b
					}
				}
			}).png().toBuffer();
			const otherHalf = await sharp({
				create: {
					width:100,
					height:100,
					channels: 3,
					background:{
						r: body.data.colorA.r,
						g: body.data.colorA.g,
						b: body.data.colorA.b
					}
				}
			})
			.composite([{input:half}])
			.png().toBuffer()
			const imageAttachment = new Discord.Attachment(otherHalf, `contrast.png`);
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.attachFile(imageAttachment)
				.setThumbnail(`attachment://contrast.png`)
				.addField("Contrast result:", `\`${body.data.result}\`\n\nBellow are some WCAG test results.`)
				.addField("Normal text", `**AA** ${(body.data.result>4.5)?"pass":"fail *(4.5 to pass)*"} \n **AAA** ${(body.data.result>7)?"pass":"fail *(7 to pass)*"}`, true)
				.addField("Large text", `**AA** ${(body.data.result>3)?"pass":"fail *(3 to pass)*"} \n **AAA** ${(body.data.result>4.5)?"pass":"fail *(4.5 to pass)*"}`, true)
				.addField("Graphical", `**AA** ${(body.data.result>3)?"pass":"fail *(3 to pass)*"}`, true)
				.addField("Test?", `The tests dictate if the contrast passes ratio test to be web accessible, according to [WCAG 2](http://www.w3.org/TR/WCAG20/). Use \`${doc.prefix}contrast info\` for more information.`);
				msg.channel.stopTyping();
				return msg.channel.send(embed);
		});
	return msg.channel.stopTyping();
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <"info">|<color one> <color two>\``)
			.addField("Valid arguments", "`cmyk(#,#,#,#)`\n`rgb(#,#,#)`\n`hsb(#,#,#)`\n`hsv(#,#,#)`\n`hsl(#,#,#)`\n`\"#\"###`\n`\"#\"######`\n`0x###[###]`\n`lab(#,#,#)`")
			.addField("Examples", `\`${doc.prefix}${this.cmd} #ab7000 fff\`\n\`${doc.prefix}${this.cmd} cmyk(10,100,42,0) 0xCD1818\`\n\`${doc.prefix}${this.cmd} info\``)
		return msg.channel.send(embed);
	}
}