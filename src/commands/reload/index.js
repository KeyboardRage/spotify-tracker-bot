const {ACCESS} = require("../../../config");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Performs hot reload of commands
 */
module.exports = {
	cmd: "reload",
	desc: "Hot-reload a command module",
	permission: ACCESS.dev,
	exec: async (msg,args) => {

		if (!args.length) {
			return msg.client.commands[this.cmd].help(msg);
		}

		let response;

		if (!args[0] in msg.client.commands) {
			response = CmdUtil.emb(msg)
				.setDescription(`:x: Could not find module with the name \`${args[0]}\``);
		} else {
			try {
				let result = msg.client.commands[args[0]].reload(msg.client);
				if (result.constructor.name === "Error") throw result;
	
				response = CmdUtil.emb(msg)
					.setDescription(`:hammer_pick: Module reloaded: \`${args[0]}\``);
			} catch(err) {
				console.error(err);
				response = CmdUtil.emb(msg)
					.setTitle(":x: Error reloading:")
					.setDescription(`\`\`\`${err.toString()}\`\`\``);
			}
		}

		return msg.channel.send(response);
	}
};