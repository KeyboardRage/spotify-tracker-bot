const request = require("request");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "ppi",
	aliases: ["size", "pixels", "dpi"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: [""],
	desc: "Calculation between PPI, Pixel dimensions, or real life size to get the unknown value.",
	exec(msg, cmd, args, doc) {
		
		// Split up values.
		let values = new Object();
		try {
			for (let i = 0; i < 2; i++) {
				let number = /\d+/.exec(args[i])[0];
				number = Math.round(parseInt(number));
				values["value" + i] = number;
				values["unit" + i] = args[i].slice(values["value" + i].toString().length);
			}
		} catch (_) {return msg.channel.send("**Invalid format:** See `+ppi ?` for help on usage.");}

		let notify = false;
		if(msg.content.startsWith(doc.prefix+"dpi")) notify = true;
		for (let i = 0; i < 2; i++) {
			switch (values["unit" + i]) {
			case "px":
			case "pixels":
			case "pixel":
			case "pix":
				values["unit" + i] = "px";
				break;
			case "cm":
			case "centimeter":
			case "centimeters":
				values["unit" + i] = "cm";
				break;
			case "in":
			case "inche":
			case "inches":
				values["unit" + i] = "in";
				break;
			case "dpi":
				notify = true;
				values["unit" + i] = "ppi";
				break;
			case "ppi":
				break;
			default:
				return msg.channel.send("**Invalid unit(s):** Only `px`, `cm`, `in` and `ppi` is allowed.");
			}
		}
		if(notify) msg.channel.send("You probably meant `PPI`. Switching to that.");

		msg.channel.startTyping();
		let query = `valueA=${values.value0}&unitA=${values.unit0}&valueB=${values.value1}&unitB=${values.unit1}`;
		request.get(`https://app.grafik-bot.net/v1/ppi?${query}`, (err, res, body) => {
			if (err) {
				msg.channel.stopTyping();
				msg.channel.send("Could not complete the command.");
				throw new Error(err);
			} else {
				let string = new String();
				body = JSON.parse(body);
				body.forEach(unit => {
					string += `**${unit.unit}:** \`${unit.value}\`\n`;
				});
				const embed = {
					"color": parseInt(process.env.THEME.substring(1), 16),
					"timestamp": Date(),
					"footer": {
						"icon_url": msg.author.avatarURL,
						"text": msg.author.tag
					},
					"fields": [{
						"name": "Result",
						"value": string
					}]
				};
				msg.channel.stopTyping();
				return msg.channel.send({embed});
			}
		});
	}, // END exec
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <#value><unit one> <#value><unit two>\``)
			.addField("Valid arguments", "Units: `in`, `cm`, `ppi`, `px`")
			.addField("Examples", `\`${doc.prefix}${this.cmd} 72ppi 1024px\`\n\`${doc.prefix}${this.cmd} 1024px 1in\`\n\`${doc.prefix}${this.cmd} 30cm 300ppi\``)
		msg.channel.send(embed);
	}
};