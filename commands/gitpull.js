/* eslint-disable no-console */
const {exec} = require("child_process");
const ACCESS = require("../data/permissions.json");

module.exports = {
	cmd: "gitupdate",
	aliases: ["git"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.owner,
	dm:true,
	desc: "Pulls new version from Github and restarts the bot with the update",
	exec(msg) {
		msg.channel.send("Pulling…")
			.then(message => {
				exec("git pull", (err, stdout, stderr) => {
					if(err) throw err;
					if(stderr) {
						console.log("Stderr:");
						console.log(stderr);
					}
					console.log(stdout);
					console.log("Finished pull, restarting...");
					message.edit("Success. Restarting…");
					exec("forever restart 0", (err,stdout,stderr) => {
						if(err) throw err;
						if(stderr) {
							console.log("Restart stderr:");
							console.log(stderr);
						}
						console.log(stdout);
					});
				});
			});
	},
	help(msg) {
		// The response for help on this command.
		msg.reply(this.desc);
	}
};