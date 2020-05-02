const {Store, Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt out of tracking. Temporarily pause if you will.
 */
module.exports = {
	cmd: "disable",
	aliases: ["opt-out"],
	desc: "Disable tracking of your Spotify activity",
	exec: async msg => {

		let result = await Mongo.disableUser(msg.author.id);
		await Store.disableUser(msg.author.id);
		let response;

		// None found, but also none created
		if (result && !result.nModified && !result.n) {
			response = CmdUtil.emb(msg)
				.setTitle(":x: Something's not right…")
				.setDescription("It seems like something went wrong disabling tracking. Try again, or contact dev if this problem persists.");
		} else if (result && result.n && result.nModified) {
			// None found, but created
			response = CmdUtil.emb(msg)
				.setTitle("Disabled!")
				.setDescription("Tracking of your Spotify activity has been paused.")
				.addField("Opt in or delete", `Simply run \`${msg.prefix}enable\` to start tracking activity again, or \`${msg.prefix}purge\` to purge all of your data`)
		} else {
			// One found (+ none modified)
			response = CmdUtil.emb(msg)
				.setTitle("Already disabled!")
				.setDescription("Your Spotify tracking is already put on hold.")
				.addField("Opt in", `Simply run \`${msg.prefix}enable\` to start tracking activity again`)
		}

		return msg.channel.send(response);
	}
};