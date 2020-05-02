const {Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
const top_tracks = require("./src/top_tracks");
const top_listeners = require("./src/top_listeners");
const top_user = require("./src/top_user");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "top",
	aliases: ["t"],
	desc: "List carious top 10's",
	syntax: "top [type]",
	examples: ["top tracks", "top listeners", "top @user"],
	subcommands: [{
		title: "tracks",
		value: "Top 10 most listened tracks in the current guild"
	}, {
		title: "listeners",
		value: "Top 10 users with the most hours tracked"
	}, {
		title: "@user",
		value: "A users top 10 most listened songs"
	}],
	exec: async (msg,args) => {
		if (!args.length) {
			return msg.channel.send("Not yet implemented")
		}

		switch (args[0].toLowerCase()) {
			case "tracks":
				return top_tracks(Mongo, CmdUtil, msg);
			case "listeners":
			case "users":
				return top_listeners(Mongo, CmdUtil, msg);
			default: {
				let user = await CmdUtil.findUserID(msg, args);
				if (!user) return msg.channel.send(CmdUtil.emb(msg)
					.setTitle(":x: Not found")
					.setDescription("Could not find any user `" + args.join(" ").replace(/`/g, "") + "`."));
				return top_user(Mongo, CmdUtil, msg, user);
			}
		}
	}
};