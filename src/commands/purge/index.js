const {Store, Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "purge",
	desc: "Entirely removes all of the data you have",
	exec: async msg => {

		response = CmdUtil.emb(msg)
			.setTitle(":x: Soon:tm:")
			.setDescription("This command has not yet been made.");

		return msg.channel.send(response);
	}
};