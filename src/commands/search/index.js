const { ACCESS } = require("../../../config")
const { Mongo } = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");

module.exports = {
	cmd: "search",
	aliases: ["s"],
	desc: "Search for songs, artists, or albums on Spotify",
	syntax: "search <[type [filter:value]] search keyword(s)>",
	examples: ["search You & Me", "search artist Flume", "search song artist:Flume You & Me", "search song Everyday anyone", "search album No redemption tour"],
	permission: ACCESS.user,
	exec: async (msg, args) => {
		if (!args.length) {
			return msg.channel.send("Help doc not yet made");
		}

		
	}
};