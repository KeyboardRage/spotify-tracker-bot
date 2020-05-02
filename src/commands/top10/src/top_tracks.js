module.exports = async (Mongo, CmdUtil, msg) => {

	const topTen = await Mongo.topTracks(msg.guild.id, 10);

	let string = String();

	topTen.forEach((song,i) => {
		if (!i) string = `\n:first_place: ${song.artists.join(", ")} — **${song.title}**\
			\n		*Played ${song.count} times, total of ${(song.playTime/60).toFixed(0)} minutes! [Listen →](https://open.spotify.com/track/${song._id})*\n`;
		else if (i===1) string += `\n:second_place: ${song.artists.join(", ")} — **${song.title}**\
			\n		*Played ${song.count} times, total of ${(song.playTime/60).toFixed(0)} minutes! [Listen →](https://open.spotify.com/track/${song._id})*\n`;
		else if (i===2) string += `\n:third_place: ${song.artists.join(", ")} — **${song.title}**\
			\n		*Played ${song.count} times, total of ${(song.playTime/60).toFixed(0)} minutes! [Listen →](https://open.spotify.com/track/${song._id})*\n`;
		else {
			string += `\n${CmdUtil.num(i+1)} ${song.artists.join(", ")} — **${song.title}**\
			\n		*${song.count} plays, over ${(song.playTime/60).toFixed(0)} minutes. [Listen →](https://open.spotify.com/track/${song._id})*\n`
		}
	});

	const embed = CmdUtil.emb(msg)
		.setTitle("Top 10: songs")
		.setDescription(string);

	return msg.channel.send(embed);
};