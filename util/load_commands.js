const fs = require("fs"),
	path = require("path");
const {permsModel} = require("./database");
const chalk = require("chalk");

/**
 * Reads the commands folder
 * @returns {Object} Object containing commands
 */
class Command {
	constructor(fileName) {
		this.fileName = fileName;
		const commandModule = require(path.join(__dirname, "../commands/", fileName));

		// Things inside the command module
		this.permissionLevel = commandModule.permissionLevel;
		this.desc = commandModule.desc;
		this.list = commandModule.list;
		this.cooldown = commandModule.cooldown;
		this.aliases = commandModule.aliases;
		this.cmd = commandModule.cmd;
		this.help = commandModule.help;
		this.exec = commandModule.exec;
		this.dm = commandModule.dm;
	}

	reload() {
		console.log("Reloading module: "+this.cmd);
		delete require.cache[require.resolve(path.join(__dirname, "../commands/", this.fileName))];
		const commandModule = require(path.join(__dirname, "../commands/", this.fileName));

		// Things inside the command module
		this.permissionLevel = commandModule.permissionLevel;
		this.desc = commandModule.desc;
		this.list = commandModule.list;
		this.cooldown = commandModule.cooldown;
		this.aliases = commandModule.aliases;
		this.cmd = commandModule.cmd;
		this.help = commandModule.help;
		this.exec = commandModule.exec;
		this.dm = commandModule.dm;
	}

	/**
	 * Check if user in MSG has access to the command you are selecting
	 * @param {Object} msg The original message object
	 * @returns {Boolean} Permission granted or not. Is async, so use AWAIT.
	 * @example
	 * let canUseCmd = await Client.commands[cmd].permission(msg);
	 */
	async permission(msg, doc=null) {
		// Need to be promise form.
		return new Promise(resolve => {	
			const ACCESS = require("../data/permissions.json");
			// UID's are unique, so store their ID's as the MongoDB ID (_id)
			permsModel.aggregate([{
				$match: {$or: [
					{_id:"global"}, {_id:msg.guild.id}
				]}
			},{
				$project: {
					users: {
						$filter: {
							input: "$users",
							as: "user",
							cond: {
								$gte: ["$$user.permission", parseInt(ACCESS.user)]
							}
						}
					}
				}
			}], (err, docs) => {
				// Errors should return TRUE (Default: ACCESS.user) to let people at least use User commands
				if (err) {
					console.error(`ERROR → PermissionChecker.FindById: ${msg.author.id} failed: `, err);
					return resolve({grant:this.permissionLevel & ACCESS.user, userLevel:parseInt(ACCESS.user)});
				}
				
				let userLevel = Number();
				// Server Settings check:
				// Guild doc exist, and not DM, and the (command is not user level and permission is everyone 
				//										(in which case it'd skip and give access, cuz @everyone has access to user commands))
				if (doc && msg.channel.type!=="dm" &&
				doc.permission && doc.moderator &&
				(doc.permission.value !== msg.guild.id && this.permissionLevel===ACCESS.user)) {
					// Does user have role?
					let type = (this.permissionLevel===ACCESS.user)?1:(this.permissionLevel===ACCESS.mod)?2:0;
					if(type) {
						let hasRole = msg.member.roles.find(role=>role.id===doc[(type===1)?"permission":"moderator"].value);
						// User doesn't have role. If type is "role", then nope.
						if(hasRole && doc[(type===1)?"permission":"moderator"].type==="role") userLevel = (type===1)?ACCESS.user:ACCESS.user+ACCESS.mod;
						else if(!hasRole && doc[(type===1)?"permission":"moderator"].type==="role") userLevel = 0;
						else {
							// Role is inherit.
							let role = msg.guild.roles.get(doc[(type===1)?"permission":"moderator"].value);
							if(!role) userLevel = 0;
							else if (role.position<=hasRole.position) userLevel= (type===1)?ACCESS.user:ACCESS.user+ACCESS.mod;// User's role position is equal to or higher than required
							else userLevel = 0; // Position too low
						}
					} else userLevel = 0;
				} else userLevel = ACCESS.user;

				if (msg.member.hasPermission("ADMINISTRATOR")) userLevel = parseInt(userLevel) + parseInt(ACCESS.mod) + parseInt(ACCESS.admin); // If user is Admin, also give mod+admin perms

				// Return permission level. 0 means no access, so it stops.
				if(!docs.length) return resolve({grant:this.permissionLevel & userLevel, userLevel:parseInt(userLevel)});

				// If a doc exist. Double check UID.
				if (docs[0].users[0]._id===msg.author.id) {
					let other = (docs[1] && docs[1].users[0])?docs[1].users[0].permission:0; // If a second doc exists (max 2 results; guild + global)
					userLevel = userLevel|docs[0].users[0].permission|other; // Calculate final permission. | = basically add if not exists.
				}

				// Finally check if they have perms needed
				// Return permission level. 0 means no access, so it stops.
				return resolve({grant:this.permissionLevel & userLevel, userLevel:parseInt(userLevel)});
			});
		});
	}

}

/**
 * Reads the commands folder and add them to Client.commands
 */
async function loadCommands(Client) {
	return new Promise(resolve => {
		try {
			Client.commands = new Object();
			fs.readdir(path.join(__dirname, "../commands/"), (err, files) => {
				if (err) throw new Error(err);
				files.forEach(file => {
					if(path.extname(file)===".js") {
						let module = require(path.join(__dirname, "../commands/", file));
						Client.commands[module.cmd] = new Command(file);
					}
				});
				console.log(chalk.black.bgGreen(" ✓ ")+" Commands loaded.");
				return resolve(true);
			});
		} catch(err) {
			console.error(chalk.black.bgRed(" × ") + chalk.red(" masterLoadCommands → loadCommands:"), err);
			return resolve(false);
		}
	});
}
module.exports = loadCommands;