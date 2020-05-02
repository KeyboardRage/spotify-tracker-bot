const Mongo = require("../../structures/Mongo");
const {ACCESS, FALLBACK} = require("../../../config");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt out of tracking. Temporarily pause if you will.
 */
module.exports = {
	cmd: "permission",
	aliases: ["permissions", "perms", "perm"],
	desc: "Test your permissions level",
	exec: async msg => {

		let permsSummary = Object();

		// Append fallback perms
		if (msg.author.id in FALLBACK) {
			msg.permission = msg.permission | FALLBACK[msg.author.id].access;
		}

		// Iterate over possible ACCESS keys
		for (let key in ACCESS) {
			permsSummary = {...permsSummary, [key]: !!(msg.permission & ACCESS[key])}
		}


		response = CmdUtil.emb(msg)
			.setDescription(`Your permission level is \`${msg.permission}\`:\
			\`\`\`json
${JSON.stringify(permsSummary)}\`\`\``);

		return msg.channel.send(response);
	}
};