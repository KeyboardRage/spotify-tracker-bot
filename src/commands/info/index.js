const CmdUtil = require("../../structures/CommandUtility");

module.exports = {
	cmd: "info",
	desc: "Get bot information",
	exec: async msg => {
		// Return found
		return msg.channel.send(CmdUtil.emb(msg)
			.setTitle("Bot information")
			.setDescription(`**Spotify tracker is a bot meant for tracking and interacting with users Spotify activity.**\
				\n\n*Users have to opt-in on tracking, and can any time pause tracking or purge their data.*`)
			.addField("Creators", `Dev: VirtusGraphics (\`164736401051484160\`)\nIdea/community: EDM (\`109068086191116288\`)`)
			.addField("Inspiration", `Bot was inspired by Spotify's poor "recently played" list, two music enthusiasts common music exchange, and an open source Discord Hack Week bot written in C#.`)
			.addField("Open source", "Inspired by [Basset](https://github.com/Aux/Basset). [This bot](https://github.com/KeyboardRage/spotify-tracker-bot) is also open source.")
			.addField("What it's not", "This is **not** a bot that plays any kind of music, handle any other music player than Spotify, nor anything unrelated to Spotify or the usage of the bot (e.g. does not do moderation).")
			.setThumbnail(msg.client.user.avatarURL({ format: "png" })));
	}
};