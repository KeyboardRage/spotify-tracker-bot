/* eslint-disable no-console */
const globalBans = require("../util/database").globalBans,
	{sliceUntil,isoTime,containsSelf,onlyIds} = require("../util/command-utilities"),
	{setBan} = require("../util/redis"),
	{devs} = require("../hidden/secrets.json");
const ACCESS = require("../data/permissions.json");

//TODO: Make the bot check self, or if attempting to ban owner.
module.exports = {
	cmd: "globalban",
	aliases: ["gban", "globban"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.dev+ACCESS.owner,
	dm:true,
	daccess: [""],
	desc: "Globally bans a server or user, permanently or until a set date, with or without a reason. Available only to bot devs.",
	async exec(msg, cmd, args) {
		// if(!args.length) {
		// 	let type = args.shift();
		// 	let target = args.shift();
		// 	let reason = (args.length)?args.join(" "):null;
		// }
		// if(type==="server") return ban_server(msg, target, reason);
		// else return ban_user(msg, target, reason);
	},
	help(msg) {
		// The response for help on this command.
		msg.reply(`+gban <"server"|"user"> <id> [reason]`);
	}
};

async function ban_server(msg, target, reason) {
	
}