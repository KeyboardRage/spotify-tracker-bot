const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const Entities = require("html-entities").AllHtmlEntities;

module.exports = {
	cmd: "encode",
	aliases: ["decode","code","binary","hex","parse"],
	cooldown: {min: 3},
	permissionLevel: ACCESS.user,
	dm: true,
	desc: "Does HTML entity, hex, and binary encoding/decoding",
	longDesc: "TEXT",
	examples:["encode d cd1818 --hex","parse e --binary hello world","parse encode ×","code decparseode &times;"],
	flags: [{
		flag:"--hex",
		default: false,
		text:"Input to encode/decode is hexadecimal"
	}, {
		flag:"--html",
		default: true,
		text:"Input to encode/decode is an HTML entity"
	}, {
		flag: "--binary",
		default: false,
		text:"Input to encode/decode is binary string"
	}],
	group: 1,
	meta: [],
	syntax: "encode <'e'|'encode'|'d'|'decode'> <input> ['--hex'|'--html'|'--binary']",
	async exec(msg, cmd, args) {
		let joined = args.join(" ");
		
		if (args.length <= 1) return msg.channel.send("**Missing argument(s):** You must specify if you want to `encode`/`e` or `decode`/`d` in the first parameter, and the target from second and onward.");
		let type = (args[0] === "d" || args[0] === "decode") ? "decode" : (args[0] === "e" || args[0] === "encode") ? "encode" : false;
		if (!type) return msg.channel.send("**Invalid argument:** First parameter must be `e`, `encode`, `d`, or `decode`. Rest of the parameters are the target(s) to encode/decode.");

		try {
			if (joined.search("--binary") !== -1) {
				return binary_ent(msg, args, type);
			} else if (joined.search("--html") !== -1) {
				return html_ent(msg, args, type);
			} else if (joined.search("--hex") !== -1) {
				return hex_ent(msg, args, type);
			} else {
				return html_ent(msg, args, type);
			}
		} catch(err) {
			return msg.channel.send("**Could not process:** "+err.toString());
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <"encode"|"e"|"decode"|"d"> <value> ["--hex"|"--binary"|"--html"]\`\nDefault flag: \`--html\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} d cd1818 --hex\`\n\`${doc.prefix}${this.cmd} e --binary hello world\`\n\`${doc.prefix}${this.cmd} encode ×\`\n\`${doc.prefix}${this.cmd} decode &times;\``);
		msg.channel.send(embed);
	}
};

async function html_ent(msg, args, type) {
	let ent = new Entities();
	args.shift();
	args = args.filter(e => e !== "--html");

	// Catch no value, too long value(s), etc.
	if (args.length >= 21) return msg.channel.send("**Cannot use command:** I don't accept that many parameters at once.");

	let result = ent[type](args.join(" "));
	if (result.search("`") !== -1) msg.channel.send(result);
	else msg.channel.send("```" + result + "```");
}

async function binary_ent(msg, args, type) {
	args.shift();
	let joined = args.join(" ");
	if(type==="encode" && joined.length>50) return msg.channel.send("**Cannot use command:** Max length exceeded for this sub-command. Binary gets long, so input must be shorter.");

	let _args = args.filter(e=>e!=="--binary");

	let output = String();
	if(type==="decode") {
		if(_args.length===1&&_args[0].length>8) output += "Your binary string is not spaced, which may result in sub-optimal or wrong output.\n\n";
		let _m = "Text output of binary:\n";
		for (let i=0;i<_args.length;i++) {
			output += String.fromCharCode(parseInt(_args[i], 2).toString(10));
		}
		if (output.search("`") === -1) return msg.channel.send(_m+"```"+output+"```");
		else return msg.channel.send(_m+output);
	}
	else {
		let _m = `Binary of \`${_args.join(" ")}\`:\n`;
		for (let i=0;i<_args.join(" ").length;i++) {
			output += _args.join(" ")[i].charCodeAt(0).toString(2) + " ";
		}
		if (output.search("`") === -1) return msg.channel.send(_m+"```"+output+"```");
		else return msg.channel.send(_m+output);
	}
}

async function hex_ent(msg, args, type) {
	args.shift();
	args = args.filter(e => e !== "--hex");

	try {
		if(type==="encode") return msg.channel.send(`\`${args[0]}\` as heximal is \`${parseInt(args[0]).toString(16)}\``);
		else return msg.channel.send(`\`${args[0]}\` as number is \`${parseInt(args[0], 16)}\``);
	} catch (err) {
		return msg.channel.send("**Could not process:** " + err.toString());
	}
}