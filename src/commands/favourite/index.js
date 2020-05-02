const { ACCESS } = require("../../../config")
const { Mongo } = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");

module.exports = {
	cmd: "favourite",
	aliases: ["fav","<3", "❤","💙","💚","💛","💜","🖤","♥","🤍","🤎","🧡"],
	desc: "Save currently playing song you or someone is playing to a list",
	syntax: "favourite [user]",
	examples: ["fav", "<3 EDM", "❤"],
	permission: ACCESS.admin,
	exec: async (msg, args) => {
		return msg.channel.send("Not created");
	}
};