const {ACCESS} = require("../../../config")
const {Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "enable-feed",
	aliases: ["set-feed"],
	desc: "Enable/set Spotify song feed to post in a specific channel",
	syntax: "enable-feed <channel>",
	examples: ["enable-feed #song-feed", "set-feed #spotify-feed"],
	permission: ACCESS.admin,
	exec: async (msg,args) => {

		if (!args.length) {
			return msg.channel.send("Not created");
		}

		// Find channel
		let channel = await CmdUtil.findChannelID(msg, args);
		if (!channel) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle(":x: Not found")
			.setDescription("Could not find any channel `"+args.join("-").repalce(/`/g,"")+"`"));

		// Create a webhook on this channel
		channel = msg.client.channels.cache.get(channel);
		if (!channel) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle(":x: Not found")
			.setDescription("Could not find any channel `" + args.join("-").repalce(/`/g, "") + "`"));

		const hook = await channel.createWebhook("Spotify tracker", {
			avatar: msg.client.user.avatarURL({format:"png",size:256}),
			reason: "Spotify feed webhook created on demand by "+msg.author.id
		});

		if (!hook || !hook.url) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle(":x: Could not create")
			.setDescription("I was unable to create a webhook."));

		await Mongo.setWebhook(msg.guild.id, hook.url)

		return msg.channel.send(CmdUtil.emb(msg)
			.setTitle("Success!")
			.setDescription("Song feed webhook created—users song feed will show up in <#"+channel.id+">.")
			.addField("Disable", `Use \`${msg.prefix}disable-feed\` to disable song feed.`)
			.addField("Change channel", `You can go to Guild Settings → Webhook → 'Spotify tracker' → 'Edit' then select a new channel.`));
		}
};