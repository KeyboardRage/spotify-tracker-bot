/* eslint-disable no-unused-vars */
module.exports = generate;
const fs = require("fs");
const path = require("path");
const perms = require("../../data/permissions.json");

async function generate(client) {
	let cmds = client.commands;
	let all = Array();

	for(let cmd in cmds) {
		let name = cmds[cmd].cmd.charAt(0);
		let c = {
			group: (cmds[cmd].permissionLevel&perms.user)?1:(cmds[cmd].permissionLevel&perms.admin)?3:4,
			permission: parseInt(cmds[cmd].permissionLevel),
			name: name.toUpperCase() + cmds[cmd].cmd.slice(1),
			shortText: cmds[cmd].desc,
			longText:"LONGTEXT",
			syntax:"SYNTAX",
			examples:["EXAMPLES"],
			meta: [{
				name:"Aliases",
				value: cmds[cmd].aliases
			}, {
				name: "Cooldown",
				value: cmds[cmd].cooldown.min
			}, {
				name: "Can be used in DM?",
				value: cmds[cmd].dm
			}]
		};
		all.push({[cmds[cmd].cmd]:c});
	}
	fs.writeFile(path.join(__dirname, "../../data/cmd_json.json"), JSON.stringify(all), err => {
		if(err) throw err;
		console.log("Successfully generated commands JSON.");
	});
}