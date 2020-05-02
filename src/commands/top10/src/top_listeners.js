module.exports = async (Mongo, CmdUtil, msg) => {

	const topTen = await Mongo.topListeners(msg.guild.id, 10);

	let string = String();

	topTen.forEach((user,i) => {
		if (!i) string = `:first_place: <@${user._id}>: Played ${user.count} songs, total of ${(user.playTime/60).toFixed(0)} minutes!\n`;
		else if (i === 1) string += `:second_place: <@${user._id}>: Played ${user.count} songs, total of ${(user.playTime/60).toFixed(0)} minutes!\n`;
		else if (i === 2) string += `:third_place: <@${user._id}>: Played ${user.count} songs, total of ${(user.playTime/60).toFixed(0)} minutes!\n`;
		else {
			string += `${CmdUtil.num(i + 1)} <@${user._id}>: Played ${user.count} songs, total of ${(user.playTime/60).toFixed(0)} minutes.\n`
		}
	});

	const embed = CmdUtil.emb(msg)
		.setTitle("Top 10: listeners")
		.setDescription(string);

	return msg.channel.send(embed);
};