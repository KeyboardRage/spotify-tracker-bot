const request = require("request"),
	sharp = require("sharp");
const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");

module.exports = {
	cmd: "colour",
	aliases: ["colorconvert", "color"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: ["ATTACH_FILES", "EMBED_LINKS"],
	desc: "Takes a colour and outputs other formats of that color, and a preview.",
	exec(msg, cmd, args) {
		if(args.length === 0) return msg.channel.send("**Missing argument:** You must specify a color. Use `+color ?` for a list of valid color types.");

		// Remove pound sign
		args[0] = args[0].replace("#", "%23");
		if(args[0].length<=2) return msg.channel.send("**Invalid argument:** If you want to use a HEX, it must be at least 3 valid characters long.");

		msg.channel.startTyping();
		try {
			request.get(`${process.env.NEW_API}${process.env.API_VERSION}/convert-color?color=${args[0]}`, {encoding: "utf8"}, async (err, res, body) => {
				if (err) {
					fn.notifyErr(msg.client, err);
					msg.channel.stopTyping();
					return msg.channel.send("**Error:** An error ocurred trying to contact my API. Incident has been reported.");
				} else if (res.statusCode !== 200) {
					fn.notifyErr(msg.client, new Error("Convert → Request.get.statusCode: " + res.statusCode));
					msg.channel.stopTyping();
					return msg.channel.send("**Error:** My API gave the wrong status code. Incident has been reported.");
				}

				try {body = JSON.parse(body);} catch {}

				if(body.err) {
					msg.channel.stopTyping();					
					return msg.channel.send(body.message);
				}

				let reply = `**HEX**: \`#${body.data.hex}\`\n**RGB**: \`${body.data.rgb}\`\n**Decimal / number**: \`${parseInt("0x"+body.data.hex)}\`\n**Nearest named**: \`${body.data.named}\` (\`${body.data.namedHex}\`)\n**HSV / HSB**: \`${body.data.hsv}\`\n**HSL**: \`${body.data.hsl}\`\n**CMYK**: \`${body.data.cmyk}\`\n**LAB**: \`${body.data.lab}\`\n**LCH**: \`${body.data.lch}\`\n**HWB**: \`${body.data.hwb}\`\n**XYZ**: \`${body.data.xyz}\`\n**Apple RGB**: \`${body.data.apple}\`\n**Grayscale**: \`${body.data.gray}\`\n**ANSI16**: \`${body.data.ansi16}\`\n**ANSI256**: \`${body.data.ansi256}\`\n**HCG**: \`${body.data.hcg}\`\n\
	[Check on Pantone](https://www.pantone.com/color-finder#/convert?colorSpace=hex&pantoneBook=pantoneColorBridgeCoatedV3M2)
	\n***NOTE:***  Other than 24-bit (8-BPC) RGB/HEX/Decimal, these values are not 100% accurate due to colour spaces and rounding.`;
				//////////////////////////////////
				const colorImg = await sharp({
						create: {
							width: 100,
							height: 100,
							channels: 3,
							background: {
								r: body.data.rgb[0],
								g: body.data.rgb[1],
								b: body.data.rgb[2]
							}
						}
					})
					.png()
					.toBuffer();
				//////////////////////////////////
				const imageAttachment = new Discord.Attachment(colorImg, `${body.data.hex}.png`);
				const embed = new Discord.RichEmbed()
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.setTimestamp(Date())
					.setColor(`#${body.data.hex}`)
					.attachFile(imageAttachment)
					.setThumbnail(`attachment://${body.data.hex}.png`)
					.addField("Colour values", reply);
				msg.channel.stopTyping();
				return msg.channel.send(embed);
			}); // END req
		} catch(err) {
			msg.channel.stopTyping();
			msg.channel.send("**Error:** An error ocurred trying to format API response. Incident has been reported.");
			throw err;
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <color>\``)
			.addField("Valid arguments", "`cmyk(#,#,#,#)`\n`rgb(#,#,#)`\n`hsb(#,#,#)`\n`hsv(#,#,#)`\n`hsl(#,#,#)`\n`\"#\"###`\n`\"#\"######`\n`0x###[###]`\n`lab(#,#,#)`")
			.addField("Examples", `\`${doc.prefix}${this.cmd} ab7000\`\n\`${doc.prefix}${this.cmd} cmyk(10,100,42,0)\`\n\`${doc.prefix}${this.cmd} #fff\``)
		msg.channel.send(embed);
	}
}