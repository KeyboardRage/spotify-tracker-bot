module.exports = async (Mongo, CmdUtil, msg, userID) => {

	const topTen = await Mongo.topByUser(userID, 10);

	let string = String();

	if (!topTen.length) return msg.channel.send(CmdUtil.emb(msg)
		.setTitle(":x: No records")
		.setDescription("<@"+userID+"> does not have any songs on record."));

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
		.setTitle("Top 10: user")
		.setDescription(`<@${userID}>'s top 10 songs:\n${string}`);

	return msg.channel.send(embed);
};