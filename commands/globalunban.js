const globalBans = require("../util/database").globalBans,
	{sliceUntil,onlyIds} = require("../util/command-utilities"),
	{setBan} = require("../util/redis");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "globalunban",
	aliases: ["gunban", "globunban"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.dev|ACCESS.owner,
	dm:true,
	daccess: [""],
	desc: "Lifts a potential global UID ban.",
	exec(msg, cmd, args) {
		let uids = msg.mentions.users.map(user => {
			return user.id;
		});

		if (uids.length == 0) {
			uids = sliceUntil(args, 0);
		}
		
		if (uids.length == 0 || onlyIds(uids) == false) {
			msg.reply("Use either only mentions or ID's. Array of userIDs's contain ID with letters, or could not find any ID's to ban.");
			return;
		}

		// Async ban promise.
		async function asyncUnban(id) {
			return new Promise((resolve, reject) => {
				globalBans.findByIdAndUpdate(id, {
					global: false,
					until: null,
					date: new Date(),
					by: msg.author.id
				}, {
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
		let bulkUnban = new Array();
		uids.forEach(id => {
			setBan(id, false);
			bulkUnban.push(asyncUnban(id));
		});

		Promise.all(bulkUnban).then(bans => {
			msg.reply("Unbanned these ID's: `" + bans.join("`, `") + "`");
			console.log(`[${new Date()}] ${msg.author.id} globally un-banned ${bans.join(", ")}`);
		}).catch(err => {
			// Couldn't ban these.
			msg.reply("Unbanned all, but this ID's gave an error: `" + err.id.join("`, `") + "`");
			console.error(err);
		});
			msg.channel.stopTyping();
	},
	help(msg) {
		// The response for help on this command.
		msg.reply("`gunban <uid(s)>`");
	}
}