const Discord = require("discord.js");

module.exports = {
	command: async function(msg, args, doc) {
		return await _command(msg, args, doc);
	},
	info: async function(msg, args, doc) {
		return await _info(msg, args, doc);
	},
	main: async function(msg, args, doc) {
		return await _main(msg, args, doc);
	}
};

async function _command(msg, args, doc) {
	// Gives main command list.
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.addField("**Commands:**", `It's quite a complicated feature, so commands are divided in to categories. Use the respective command to see all sub-commands for a given category:\
		\n• \`${doc.prefix}job info\` Describes what this feature is, and usecase example.\
		\n• \`${doc.prefix}job\` Gives this command list.\
		\n• \`${doc.prefix}job cmds\` Gives list of main entrypoint commands.\
		\n• \`${doc.prefix}job cmds case\` Gives sub-commands related to a specific job.\
		\n• \`${doc.prefix}job cmds mod\` Commands specifically available to bot moderator *(guild staff)*.\
		\n• \`${doc.prefix}job cmds settings\` Bot settings for jobs in current guild, for guild administrators.\
		\n• \`${doc.prefix}job cmds user\` See generic commands for users, like for potential buyers/sellers.`);
	return msg.channel.send(embed);
}

async function _info(msg, args, doc) {
	// Describes what this feature is, and usecase example.
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.addField("**What is jobs?**", "**In short;** the jobs feature is a logging system and middleman for jobs that between a buyer and seller. **In detail;** with jobs you can\
		create unique job cases with information such as brief, budget, and deadline, give updates to the job with events/progress, submit files, mark as done to make files available to buyer, \
		allow buyer/seller to give each other a review, let guild moderators inspect jobs and act as a trustworthy intermediary.")
		.addField("**Usecase example**", "**1.** You're a graphic designer, and someone want to buy a banner. You create a job, specify a agreed upon budget/payment if any, the brief itself, and a deadliine if any.\
		**2.** Once made, an invite to confirm the job is sent to the buyer automatically. **3.** Once buyer accepts, you are notified, and a job is optionally posted in a guild's channel.\
		**4.** All details henceforth are shared between buyer/seller, only buyer, only seller, and the guilds Staff depending on the event update. You start working. \
		**5.** You and/or buyer make periodical updates on progress or significant events that are saved. **6.** Eventually you finish and submit files or a download link to the job events *(in DM's with the bot)* — buyer can only\
		see that a file is submitted, but has no access to the file(s). **7.** Buyer feel uneasy, and can confront a guild staff to check the files/events of the job. **8.** All is well and buyer pays you. \
		You mark the job as done, and buyer can now access all files. If specified, the original job notification in the guild is also updated to 'completed'. **9.** You and the buyer are happy with each other \
		and can now give each other a review, which refers to the job. **10.** Other potential buyers can see your reviews, and thus decide to use you. Likewise, a buyer can be considered trustworthy.")
		.addField("**Commands:**", `It's quite a complicated feature, so commands are divided in to categories. Use the respective command to see all sub-commands for a given category:\
		\n• \`${doc.prefix}job info\` Givies this info message.\
		\n• \`${doc.prefix}job\` Gives this command list, without all the pretext above.\
		\n• \`${doc.prefix}job cmds\` Gives list of main entrypoint commands.\
		\n• \`${doc.prefix}job cmds case\` Gives sub-commands related to a specific job.\
		\n• \`${doc.prefix}job cmds mod\` Commands specifically available to bot moderator *(guild staff)*.\
		\n• \`${doc.prefix}job cmds settings\` Bot settings for jobs in current guild, for guild administrators.\
		\n• \`${doc.prefix}job cmds user\` See generic commands for users, like for potential buyers/sellers.`);
	return msg.channel.send(embed);
}

async function _main(msg, args, doc) {
	// Gives list of main entrypoint commands.
}