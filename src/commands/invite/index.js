const CmdUtil = require("../../structures/CommandUtility");
const config = require("../../../config");

module.exports = {
	cmd: "invite",
	aliases: ["i", "inv"],
	desc: "Get Bot invite link and information",
	exec: async msg => {
		// Return found
		return msg.channel.send(CmdUtil.emb(msg)
			.setTitle("Invite bot")
			.setDescription(`The bot is not yet available for anyone to invite. Invite has to be manually handled by a community manager.\
			\n\nHere is the [invite link](https://discordapp.com/oauth2/authorize?client_id=${msg.client.id}&permissions=${config.client.invitePermission}&scope=bot).\
			\n\nInvite permission level: [\`${config.client.invitePermission}\`](https://discordapi.com/permissions.html#${config.client.invitePermission})`)
			.setThumbnail(msg.client.user.avatarURL({format:"png"})));
	}
};