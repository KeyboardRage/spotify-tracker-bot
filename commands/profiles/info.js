const Discord = require("discord.js");

module.exports = {
	main: async function(msg, args, doc) {
		return _main(msg, args, doc);
	},
	watermark: async function(msg, args, doc) {
		return _watermark(msg, args, doc);
	}
};

async function _main(msg, args, doc) {
	switch(args.shift()) {
	case "watermark":
	case "wm":
	case "12":
		return _watermark(msg, args, doc);
	}
}

async function embed(msg) {
	return new Promise(resolve => {
		const _embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL);
		return resolve(_embed);
	});
}

async function _watermark(msg, args, doc) {
	let _embed = await embed(msg);
	_embed.addField("About", `A custom watermark allow you to define your own 200×200 px PNG that will be used as a repeating pattern with the \`${doc.prefix}watermark\` command.`)
		.addField("Using the watermark", "You have to **vote for Grafik to enable custom watermark for 48 hours**. If used within 48 hours of voting, Grafik will automatically try to use your custom watermark, if you have any. Once 48 hours has passed, it will fallback to default. Re-enable it again simply by voting. You do not need to re-set the watermark.")
		.addField("**Not** using the watermark", "If you for whatever reason do not wish to use your custom watermark and instead the default, you can add the flag `--normal` when performing the command.")
		.addField("Setting a watermark", `You can set a 200×200 px PNG by using \`${doc.prefix}profile set watermark <image url>\`, or alternatively embed your image along with the command.`);
	return msg.channel.send(_embed);
}