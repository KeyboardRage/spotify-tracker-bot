const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "reload",
	aliases: ["reload"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm: true,
	daccess: [""],
	desc: "Reloads a module. Bot owner only.",
	exec(msg, cmd, args) {
		if	(!msg.client.commands.hasOwnProperty(args[0])) {
			msg.reply(`module \`${args[0]}\` **does not exist**.`);
			return;
		} else {
			try {
				msg.client.commands[args[0]].reload();
				msg.reply(`module \`${args[0]}\` **reloaded**.`);
			} catch(err) {
				// Some error ocurred.
				console.error(err);
				msg.reply(`**failed** to reload \`${args[0]}\`.`);
			}
		}
	},
	help(msg) {
		// The response for help on this command.
		msg.reply("`+reload <module name by cmd>` — Hot-reloads the module.");
	}
};