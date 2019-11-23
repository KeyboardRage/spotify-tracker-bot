const request = require("request");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd:"watermark",
	aliases: ["mark", "wm"],
	cooldown: {min:8},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc:"Generate a watermarked version of your image.",
	exec(msg, cmd, args, doc) {
		let options = {
			color: "black",
			opacity: 50,
			url: null,
			normal: false
		};
		if (msg.channel.type !== "dm") msg.delete();

		let pass = {url: null,pass: false},
			imageUrl = new RegExp(/^(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?(\.jpg|\.jpeg|\.png|\.webp)/, "i");
		args.forEach(arg => {
			if(imageUrl.test(arg)) {
				pass = {
					pass:true,
					url: pathFromUrl(arg)
				};
			}
		});
		try {
			if (msg.embeds.length > 0 && msg.embeds[0].type === "image") {
				options.url = msg.embeds[0].url;
			} else if (pass.pass) {
				options.url = pass.url;
			} else if (msg.attachments) {
				let emb = msg.attachments.map(att => {
					return att;
				});
				// Check if image.
				if (/(\.png|\.jpg|\.jpeg|\.bmp|\.webp)$/i.test(emb[0].url) == false) {
					msg.channel.send("**Invalid input:** Unsupported image format.");
					return;
				}
	
				if (emb[0].width > 3000 || emb[0].height > 3000) {
					msg.channel.send("**Invalid input:** Image dimensions exceeds the limit.");
					return;
				}
				options.url = emb[0].url;
			} else {
				msg.channel.send("**Invalid input:** Unsupported image format or could not detect image url/embed.");
				return;
			}
		} catch (err) {
			msg.channel.send("**Invalid input:** Could not detect any image URL or embed.");
			return;
		}
		
		args.forEach(arg => {
			if (arg.toLowerCase() == "black" || arg.toLowerCase() == "white") {
				options.color = arg.toLowerCase();
			} else if(/^[0-9]{1,3}$/.test(arg)) {
				options.opacity = parseInt(arg);
			} else if (arg==="--normal") {
				options.normal = true;
			}
		});
		options.user = msg.author.id;
		msg.channel.startTyping();
		request.post(`${process.env.NEW_API}${process.env.API_VERSION}/watermark`, {form: options}, (err, res, body) => {
			if(err) {
				console.error(err);
				msg.channel.stopTyping();
				return msg.channel.send("Could not process your request due to an error. Try again later.");
			}
			else {
				try {
					body = JSON.parse(body);
				} catch {};

				if (body.err) {
					msg.channel.stopTyping();
					msg.channel.send(body.message);
					return
				}
				msg.channel.stopTyping();
				msg.channel.send(body.message);
			}
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} [image url if used] [\"black\"|\"white\"|\"--normal\"] [# 0 to 100 opacity]\``)
			.addField("Flags", "`--normal` use normal watermarking instead of a custom. See `"+doc.prefix+"profile info watermark` for more info.")
			.addField("Valid arguments", "`an image URL`, `\"black\"`, `\"white\"`, `\"--normal\"`, `#…`, `#.#`, `.#`")
			.addField("Examples", `\`${doc.prefix}${this.cmd} https://i.thevirt.us/06/K6j1F.png white 30\`\n\`${doc.prefix}${this.cmd}  https://i.thevirt.us/06/K6j1F.png 80 black\`\n\`${doc.prefix}${this.cmd} 15\` *(with an image embeded)*`)
		msg.channel.send(embed);
	}
};

function pathFromUrl(url) {
	return url.split(/[?#]/)[0];
}