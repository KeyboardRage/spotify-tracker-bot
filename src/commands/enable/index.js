const {Store, Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "enable",
	aliases: ["opt-in"],
	desc: "Enable tracking of your Spotify activity",
	exec: async msg => {

		let result = await Mongo.enableUser(msg.author.id, msg.author.tag);
		await Store.enableUser(msg.author.id);
		let response;
		
		// Find guilds this user is in
		let guildList = Array();
		msg.client.guilds.cache.forEach(guild => {
			if (guild.members.cache.has(msg.author.id)) guildList.push(guild.id);
		});

		// Add these guilds to the user's record
		await Mongo.addUserToGuild(msg.author.id, guildList);
		
		// None found, but also none created
		if (result && !result.nModified && !result.n) {
			response = CmdUtil.emb(msg)
				.setTitle(":x: Something's not right…")
				.setDescription("It seems like something went wrong enabling tracking. Try again, or contact dev if this problem persists.");
		} else if (result && result.nModified) {
			// None found, but created
			response = CmdUtil.emb(msg)
				.setTitle("Enabled!")
				.setDescription("Now tracking your Spotify activity.")
				.addField("Opt out", `Simply run \`${msg.prefix}disable\` to pause activity tracking, or \`${msg.prefix}purge\` to purge all of your data`)
		} else {
			// One found (+ none modified)
			response = CmdUtil.emb(msg)
				.setTitle("Already enabled!")
				.setDescription("You already have Spotify tracking enabled.")
				.addField("Opt out", `Simply run \`${msg.prefix}disable\` to pause activity tracking, or \`${msg.prefix}purge\` to purge all of your data`)
		}

		return msg.channel.send(response);
	}
};