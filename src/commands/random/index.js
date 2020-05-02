const { Mongo } = require("../../util/setup");
const CmdUtil = require("../../structures/CommandUtility");
/**
 * Command for letting users opt in on tracking
 */
module.exports = {
	cmd: "random",
	aliases: ["r", "rng"],
	desc: "Get random song any, or a user, in this guild once listened to",
	syntax: "random [user]",
	examples: ["random", "random @user", "rng Username#0000"],
	subcommands: [{
		title: "[user]",
		value: "Get a random song this user once listened to"
	}],
	exec: async (msg, args) => {
		if (args.length) {
			let user = await CmdUtil.findUserID(msg, args);
			if (!user) return msg.channel.send(CmdUtil.emb(msg)
				.setTitle(":x: Not found")
				.setDescription("Could not find any user `" + args.join(" ").replace(/`/g, "") + "`."));

			let songs = await Mongo.userSongCount(user);

			if (!songs.count) return msg.channel.send(CmdUtil.emb(msg)
				.setTitle(":x: None found")
				.setDescription(`<@${user}> does not have any songs in their records.`));
			songs = await Mongo.randomUserSong(user);

			return msg.channel.send(CmdUtil.emb(msg)
				.setDescription(`A random song <@${user}> played at some point…`)
				.addField(songs.a.join(", "), `[${songs.t}](https://open.spotify.com/track/${songs.l})`)
				.setThumbnail(`https://i.scdn.co/image/${songs.i}`));
		}

		let song;

		// Iteration count. Serve as a breadkoff in case no songs found.
		for(let i=0;i<6;i++) {
			if (i>=6) {
				song = false;
				break;
			}

			song = await Mongo.randomGuildSong(msg.guild.id);
			if (song) break;
		}
		song = song.songs;

		// If none found
		if (!song) return msg.channel.send(CmdUtil.emb(msg)
			.setTitle(":x: None found")
			.setDescription(`Could not find any random songs in this guild.`));

		// Return found
		return msg.channel.send(CmdUtil.emb(msg)
			.setDescription(`Random guild song, played by <@${song.u}> at some point…`)
			.addField(song.a.join(", "), `[${song.t}](https://open.spotify.com/track/${song.l})`)
			.setThumbnail(`https://i.scdn.co/image/${song.i}`));
	}
};