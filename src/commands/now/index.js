const {Mongo} = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "now",
	aliases: ["playing"],
	desc: "Which song you or a user is playing, or last played",
	syntax: "now [user]",
	examples: ["now", "now Username", "now User#0000", "now @user"],
	subcommands: [{
		title: "user",
		value: "Get currently playing or last played song by user"
	}],
	exec: async (msg,args) => {

		if (args.length) {
			let userID = await CmdUtil.findUserID(msg, args);
			if (!userID) return msg.channel.send(CmdUtil.emb(msg)
					.setTitle(":x: Not found")
					.setDescription("Could not find any user `" + args.join(" ").replace(/`/g, "") + "`."));

			// Fetch user doc
			let doc = await Mongo.lastPlayed(userID);

			// No document
			if (!doc) return msg.channel.send(CmdUtil.emb(msg)
				.setTitle(":x: None found")
				.setDescription("Could not find any song records on <@"+userID+">."));

			// Not currently playing
			if (!doc.end) return msg.channel.send(CmdUtil.emb(msg)
				.setTitle("Currently playing")
				.setDescription(`<@${userID}> is now playing…`)
				.addField(doc.artists.join(", "), `[${doc.title}](https://open.spotify.com/track/${doc.listen})`)
				.setThumbnail(`https://i.scdn.co/image/${doc.icon}`)
				.setFooter(`Song resumed`)
				.setTimestamp(doc.start));
			
			// Currently playing
			return msg.channel.send(CmdUtil.emb(msg)
				.setTitle("Last played")
				.setDescription(`Last played by <@${userID}>`)
				.addField(doc.artists.join(", "), `[${doc.title}](https://open.spotify.com/track/${doc.listen})`)
				.setThumbnail(`https://i.scdn.co/image/${doc.icon}`)
				.setFooter(`Song ended`)
				.setTimestamp(doc.end));
		}

		// Fetch user doc
		let userID = msg.author.id;
		let doc = await Mongo.lastPlayed(userID);

		// No document
		if (!doc) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle(":x: None found")
			.setDescription("You have no songs tracked!"));

		// Not currently playing
		if (!doc.end) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle("Currently playing")
			.addField(doc.artists.join(", "), `[${doc.title}](https://open.spotify.com/track/${doc.listen})`)
			.setThumbnail(`https://i.scdn.co/image/${doc.icon}`)
			.setFooter(`Song resumed`)
			.setTimestamp(doc.start));
			

		// Currently playing
		return msg.channel.send(CmdUtil.emb(msg)
			.setTitle("Last played")
			.addField(doc.artists.join(", "), `[${doc.title}](https://open.spotify.com/track/${doc.listen})`)
			.setThumbnail(`https://i.scdn.co/image/${doc.icon}`)
			.setFooter(`Song ended`)
			.setTimestamp(doc.end));
	}
};