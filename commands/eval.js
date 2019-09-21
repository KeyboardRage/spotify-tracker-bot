const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "eval",
	aliases: ["calc"],
	cooldown: {min: 3},
	permissionLevel: ACCESS.owner,
	dm:true,
	desc: "Does a unfiltered JS eval.",
	async exec(msg, cmd, args, doc) {
		try {
			let raw = (msg.content.search("--raw") === -1)?false:true,
				removeMsg = (msg.content.search("--silent") === -1)?false:true;
			let data = msg.content.substring(doc.prefix.length+5).replace("--silent","").replace("--raw", "").trim();
	
			if(removeMsg) msg.delete();
			if(raw) return await eval(data);
			else return msg.channel.send(`\`\`\`${await eval(data)}\`\`\``);
		} catch(e) {
			return msg.channel.send(`\`\`\`${e.toString()}\`\`\``);
		}
	},
	help(msg) {
		// The response for help on this command.
		msg.channel.send("Does a unfiltered JS eval.\n**Flags:**\n`--raw`: raw execution, doesn't show result.\n`--silent`: Removes original message initiating it.");
	}
};