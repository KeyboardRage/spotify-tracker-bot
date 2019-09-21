const request = require("request");
const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const fn = require("../util/response_functions");
module.exports = {
	cmd: "convert",
	aliases: ["conv", "units"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm:true,
	desc: "Generic conversion of a value from unit A to unit B.",
	exec(msg, cmd, args) {
		if (!/^(\d+(\.\d+)?)|(\.\d+)$/.test(args[0])) return msg.reply("First argument must be the `amount`. Second is `from`, third is `to`.");

		// If starting with dot
		if(/^\.\d+/.test(args[0])) args[0] = parseFloat("0"+args[0]);
		if (parseInt(args[0]) > 99999999) return msg.reply("That number is a bit too high for me to bother processing.");

		msg.channel.startTyping();
		try {
			request.get(`${process.env.NEW_API}${process.env.API_VERSION}/convert-unit?value=${args[0]}&from=${args[1]}&to=${args[2]}`, {encoding:"utf8"}, (err,res,body) => {
				if(err) {
					fn.notifyErr(msg.client, err);
					msg.channel.stopTyping();
					return msg.channel.send("**Error:** An error ocurred trying to contact my API. Incident has been reported.");
				} else if (res.statusCode!==200) {
					msg.channel.stopTyping();
					fn.notifyErr(msg.client, new Error("Convert → Request.get.statusCode: "+res.statusCode));
					return msg.channel.send("**Error:** My API gave the wrong status code. Incident has been reported.");
				}

				try {body = JSON.parse(body);} catch {}
				if (body.err) return msg.channel.send(body.message);

				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Conversion", `${body.amount} ${body.from} is **${body.result}** ${body.to}.`);
				msg.channel.stopTyping();
				return msg.channel.send(embed);
			});
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <value> <from unit> <to unit>\``)
			.addField("Valid arguments", "[See list here](https://grafik-bot.net/units.html). Also supports common values, like `inch`, `feet`, `weeks`, etc.")
			.addField("Examples", `\`${doc.prefix}${this.cmd} 30 pica cm\`\n\`${doc.prefix}${this.cmd} 2 days hours\`\n\`${doc.prefix}${this.cmd} 200 m/h km/h\`\n\`${doc.prefix}${this.cmd} 29 C F\``)
		return msg.channel.send(embed);
	}
}

/*
List of units:
mm, cm, m, km, pt, pc, in , yd, ft - us, ft, fathom, mi, nMi, mm2, cm2, m2, ha, km2, in2, yd2, ft2, ac, mi2, mcg, mg, g, kg, mt, oz, lb, t, mm3, cm3, ml, cl, dl, l, kl, m3, km3, krm, tsk, msk, kkp,
	glas, kanna, tsp, Tbs, in3, fl - oz, cup, pnt, qt, gal, ft3, yd3, ea, dz, C, K, F, R, ns, mu, ms, s, min, h, d, week, month, year, b, Kb, Mb, Gb, Tb, B, KB, MB, GB, TB, ppm, ppb, ppt, ppq, m / s, km / h, m / h, knot, ft / s, min / km, s / m, min / mi, s / ft, Pa, kPa, MPa, hPa, bar, torr, psi, ksi, A, mA, kA, V, mV, kV, W, mW, kW, MW, GW, VAR, mVAR, kVAR, MVAR, GVAR, VA, mVA, kVA, MVA, GVA, Wh, mWh, kWh, MWh, GWh, J, kJ, VARh, mVARh, kVARh, MVARh, GVARh, mm3 / s, cm3 / s, ml / s, cl / s, dl / s, l / s,
	l / min, l / h, kl / s, kl / min, kl / h, m3 / s, m3 / min, m3 / h, km3 / s, tsp / s, Tbs / s, in3 / s, in3 / min, in3 / h, fl - oz / s, fl - oz / min, fl - oz / h, cup / s, pnt / s, pnt / min, pnt / h, qt / s, gal / s, gal / min, gal / h, ft3 / s, ft3 / min, ft3 / h, yd3 / s, yd3 / min, yd3 / h, lx, ft - cd, mHz, Hz, kHz, MHz, GHz, THz, rpm, deg / s, rad / s, rad, deg, grad, arcmin, arcsec, c, mC, μC, nC, pC, N, kN, lbf, g - force, m / s2
*/