const fe = require("../util/command-utilities");
const {serverSettings} = require("../util/database");
const Discord = require("discord.js");
const {set_session,del_session,check_session} = require("../util/session");
const ACCESS = require("../data/permissions.json");
const fn = require("../util/response_functions");
const Sentry = require("../util/extras");
let guildRoles = Object();

module.exports = {
	cmd: "init",
	aliases: ["initialize","start"],
	cooldown: {min: 20},
	permissionLevel: ACCESS.admin,
	dm: false,
	desc: "Starts the bot setup guide. Guides you though setting all the bot settings.",
	async exec(msg, cmd, args, doc) {
		set_session(msg.author.id, "init", msg.guild.id);

		let response = "*This command is now locked for the duration of this session.*\
		\n<:Stop:588844523832999936> You can at any time say `abort` to stop and discard all.\
		\n<:Pause:588844523640061975> You can at any time say `stop` to stop and saved changes made so far.";
		// Start with this command
		return send(msg, doc, meta, response, init);
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd}\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``)
		msg.channel.send(embed);
	}
};

async function stop(msg, doc, meta) {
	// Save.
}

async function send(msg, doc, meta, response, cb) {
	fe.sendAndAwait(msg, response)
		.then(r => {

		})
		.catch(err=>{
			if(err.code && err.code === 500013) {
				// No permission to send messages.
			} else if (err.size===0) {
				// Time ran out.
			} else {
				fn.notifyErr(msg.client, err);
				return stop(msg, doc, meta);
			}
		});

}