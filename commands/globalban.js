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
	desc: "Globally bans one or more servers or users, permanently or until a set date, with or without a reason. Available only to bot devs.",
	exec(msg, cmd, args) {
		//? Get duration and reason defenitions
		let time = args.indexOf("-t"),
			reason = args.indexOf("-r");
		if(time>0) {
			time = args[time+1];
			try {
				time = new isoTime(time).end();
			} catch(err) {
				msg.reply("Invalid time format. Without spaces, use ISO 8601 format, with 'months' as 'mo'.");
			}
		}
		if(reason>0) {
			reason = args[time+1];
			// Top at the index where time begins. Else, to the end of the arguments.
			let stop = (args.indexOf("-t") > args.indexOf("-r")) ? args.indexOf("-t") : args.length;
			reason = sliceUntil(args, "-r", stop).join(" ");
		}

		let uids = msg.mentions.users.map(user => {
			return user.id;
		});
		//? BAN: USER =================
		if(args[0] == "user") {

			if (uids.length == 0) {
				// Slice array, but detect time and reason.
				let useIndex;
				// Use lowest possible index, but it neither exist, set to null.
				if (args.indexOf("-r") > 0 || args.indexOf("-t") > 0) {
					if (args.indexOf("-r") == -1) {
						// R does not exist.
						useIndex = args.indexOf("-t");
					} else if (args.indexOf("-t") == -1) {
						// T does not exist.
						useIndex = args.indexOf("-r");
					} else if (args.indexOf("-r") > args.indexOf("-t")) {
						// Both exist and R is higher than T
						useIndex = args.indexOf("-t");
					} else {
						useIndex = args.indexOf("-r");
					}
				} else useIndex = null;
			
				uids = sliceUntil(args, 1, useIndex);
			}

			if (uids.length == 0 || !onlyIds(uids)) {
				msg.reply("Use either only mentions or ID's. Array of userIDs's contain ID with letters, or could not find any ID's to ban.");
				return;
			}
			if (containsSelf(uids, msg)) {
				msg.reply("Self-ban UUID prevented.");
				return;
			}
			if (containsSelf([msg.client.user.id], msg)) {
				msg.reply("Cannot ban myself.");
				return;
			}
			if (!containsSelf(Object.keys(devs), msg)) {
				msg.reply("Cannot ban a developer.");
				return;
			}

			// Async ban promise.
			async function asyncBan(id) {
				return new Promise((resolve,reject) => {
					globalBans.findByIdAndUpdate(id, {
						type:"user",
						global:true,
						until:(time!=-1)?time:null,
						reason:(reason!=-1)?reason:null,
						date:new Date(),
						by: msg.author.id
					}, {upsert:true,useFindAndModify:true}, (err,res) => {
						if(err) reject({id:id, err:err});
						else resolve(id);
					});
				});
			}
			let bulkBan = new Array();
			uids.forEach(user =>{
				setBan(user, true);
				bulkBan.push(asyncBan(user));
			});

			Promise.all(bulkBan).then(bans => {
				msg.reply("Banned these user ID's: `"+bans.join("`, `")+"`");
				console.log(`[${new Date()}] ${msg.author.id} globally banned ${bans.join(", ")}`);
			}).catch(err => {
				// Couldn't ban these.
				msg.reply("Banned all, but this user ID's gave an error: `" + err.id.join("`, `") + "`");
				console.error(err);
				throw new Error(err);
			});



		} else if (args[0] == "server") {
			//? BAN: SERVER =================
			if (uids.length != 0) {
				msg.reply("Use `+gban user <user(s)>` to ban users.");
				return;
			}

			let useIndex;
			// Use lowest possible index, but it neither exist, set to null.
			if (args.indexOf("-r") > 0 || args.indexOf("-t") > 0) {
				if (args.indexOf("-r") == -1) {
					// R does not exist.
					useIndex = args.indexOf("-t");
				} else if (args.indexOf("-t") == -1) {
					// T does not exist.
					useIndex = args.indexOf("-r");
				} else if (args.indexOf("-r") > args.indexOf("-t")) {
					// Both exist and R is higher than T
					useIndex = args.indexOf("-t");
				} else {
					useIndex = args.indexOf("-r");
				}
			} else useIndex = null;
		
			let idArray = sliceUntil(args, 1, useIndex);
			if (idArray.length == 0 || !onlyIds(idArray)) {
				msg.reply("Array of server ID's contain ID with letters, or could not find any ID's to ban.");
				return;
			}
			if (containsSelf(idArray, msg)) {
				msg.reply("Self-ban UUID prevented.");
				return;
			}
	
			// Async ban promise.
			async function asyncBan(id) {
				return new Promise((resolve, reject) => {
					globalBans.findByIdAndUpdate(id, {
						type: "server",
						global: true,
						until: (time != -1) ? time : null,
						reason: (reason != -1) ? reason : null,
						date: new Date(),
						by: msg.author.id
					}, {
						upsert: true,
						useFindAndModify: true
					}, (err, res) => {
						if (err) reject({
							id: id,
							err: err
						});
						else resolve(id);
					});
				});
			}
			let bulkBan = new Array();
			idArray.forEach(server => {
				setBan(server, true);
				bulkBan.push(asyncBan(server));
			});

			Promise.all(bulkBan).then(bans => {
				msg.reply("Banned these server ID(s): `" + bans.join("`, `") + "`");
				msg.channel.stopTyping();
			}).catch(err => {
				// Couldn't ban these.
				msg.reply("Banned all, but this server ID(s) gave an error: `" + err.id.join("`, `") + "`");
				console.error(err);
				msg.channel.stopTyping();
				throw new Error(err);
			});
	
		} else {
			msg.reply("First parameter is invalid. String required: `server` or `user`.");
		}
		msg.channel.stopTyping();
	},
	help(msg) {
		// The response for help on this command.
		msg.reply("`+gban <server|user> <uid(s)> [-t <N y/m/d/h/m/s<] [-r <reason>]`");
	}
};