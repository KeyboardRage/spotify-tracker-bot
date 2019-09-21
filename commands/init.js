const fn = require("../util/command-utilities"),
	// userCommands = require("../data/commands-user.json"),
	// {checkAlias} = require("../util/checkAlias"),
	db = require("../util/database").serverSettings,
	{RedisDB} = require("../util/redis");
let guildRoles = Object();
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "init",
	aliases: ["initialize","start"],
	cooldown: {min: 20},
	permissionLevel: ACCESS.admin,
	dm: false,
	desc: "Starts the bot setup guide. Guides you though setting all the bot settings.",
	async exec(msg, cmd, args, doc) {
		msg.client.locks = {
			...msg.client.locks,
			[msg.guild.id]: {
				user: msg.author.id,
				cmd: "init"
			}
		};

		msg.guild.roles.map(role => {
			guildRoles = {
				...guildRoles,
				[role.name.toLowerCase()]: role.id
			};
		});

		let response = `*This command is now locked for the duration of this session.*\n\n**Not important, but might be nice to know:**\
				\n•    This is a tool to go through all settings and help you along the way.\
				\n•    You can at any time stop and save progress so far by saying \`stop\`.\
				\n•    This guide will \`stop\` automatically after 90 seconds of no response.\
				\n•    Any response, even invalid ones, will re-set 90 seconds timeout.\
				\n•    If there's 15 seconds left, I'll let you know and ask if you want me to wait longer.\
				\n•    You can at any time abort and discard all progress so far by saying \`abort\`.\
				\n•    Initializing after completion may overwrite the current settings *(will let you know)*.\
				\n•    While this guide is active, it will be locked in this guild until you either complete, stop, or abort.\
				\n•    At the bottom of every step there's possible replies you can use. Simply write the appropriate response.\
				\n•    When setting permission, or using this guide, roles and users are never @mentioned, but channels are.\
				\n•    This guide will produce a lot of messages from me, and possibly you, so be prepared for that.\
				\n\n**Write \`next\` to continue, anything else to abort.**`;
		// Start with this command
		meta.run=false; //! Needed to fix instant-fail on second use.
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

function roleTag(roleId, bool=true) {
	for (let role in guildRoles) {
		if (roleId === guildRoles[role]) {
			if(bool) role = role.replace("@", "");
			return role;
		}
	}
}


async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

function removeDupes(array) {
	return array.reduce((e, i) => e.includes(i) ? e : [...e, i], []);
}

let t,tt,
	meta = {
		step: 0,
		bool: false,
		run: false
	};
let secondsleft = false;

async function send(msg, doc, meta, reply, cb) {
	let timelimit = 90;
	if (msg.author.id !== msg.client.locks[msg.guild.id].user) return;

	secondsleft = false;
	if (meta.run) {
		// Just run.
		if (reply) msg.channel.send(reply);
		meta.run = false;
		return cb(msg, doc, meta, reply);
	} else {
		t = setTimeout(() => {
			msg.channel.send("<:Info:588844523052859392> 15 seconds left until I have to stop and save.\n\n**Reply with `wait` now to extend time.**");
			secondsleft = true;
		}, timelimit*1000-15000);

		// Timeout:
		tt = setTimeout(() => {
			msg.channel.send("<:Stop:588844523832999936> Time ran out.");
			return stop(msg, doc, meta);
		}, timelimit*1000);

		fn.sendAndAwait(msg, reply, {maxMatches:1, time:timelimit*1000})
			.then(r => {
				clearTimeout(t);
				clearTimeout(tt);

				if (r === "stop") return stop(msg, doc, meta, false);
				else if (r === "abort") return stop(msg, doc, meta, true);
				else if (r === "wait" && secondsleft) return send(msg, doc, meta, "<:Yes:588844524177195047> Time extended.", cb);
				else return cb(msg, doc, meta, r.toLowerCase());
			})
			.catch(err => {
				return handleErr(err, msg, doc, meta);
			});
	}
}

async function stop(msg, doc, meta, abort=false) {
	clearTimeout(t);
	clearTimeout(tt);
	delete msg.client.locks[msg.guild.id];
	if (abort) return msg.channel.send("<:Stop:588844523832999936> Alright, aborted. Progress discarded.");

	let response = (meta.err) ? "<:Stop:588844523832999936> I had to stop.\n" : "<:Stop:588844523832999936> Stopped.\n";
	
	let saved = false;
	if (!meta.err) {
		saved = await save(msg, doc, meta);
		response += (saved) ? "<:Yes:588844524177195047> Saved progress so far." : "<:Stop:588844523832999936> I could not save the progress.";
	}
	meta.err=false; // Reset.

	if (saved) {
		msg.channel.send(response);
		return summary(msg, doc, meta);
	}
	else return msg.channel.send(response);
}

function findRole(input, allowEveryone=true) {
	return new Promise((resolve, reject) => {
		try {
			// Simple line to make "everyone" work.
			input = (input === "everyone") ? "@everyone" : input;

			if(input==="@everyone" && allowEveryone===false) return resolve(false);

			// Get role by pure ID
			if (/^(\d+)$/.test(input)) {
				if (Object.values(guildRoles).indexOf(input) !== -1) return resolve(input);
				else return resolve(null);
			}

			// Get role by tag
			else if (/^<@&(\d+)>$/.test(input)) {
				let id = input.slice(3, -1);

				if (Object.values(guildRoles).indexOf(id) !== -1) return resolve(id);
				else return resolve(null);
			}

			// Get role by name
			else {
				if (guildRoles.hasOwnProperty(input)) return resolve(guildRoles[input]);
				else return resolve(null);
			}
		} catch (err) {
			return reject(err);
		}
	});
}

function handleErr(err, msg, doc, meta) {
	meta.err = true;
	console.error(`[${Date()}] Error: init command → Guild: ${msg.guild.name} (${msg.guild.id}). User: ${msg.author.username} (${msg.author.id}). Meta: ${JSON.stringify(meta)}. ERROR:`, err);

	return stop(msg, doc, meta);
}

async function init(msg, doc, meta, reply) {
	if (reply !== "next") {
		clearTimeout(t);
		clearTimeout(tt);
		delete msg.client.locks[msg.guild.id];
		return msg.channel.send("Alright, stopped.");
	}

	meta.step=1;

	return prefix(msg, doc, meta);
}

async function prefix(msg, doc, meta, reply) {
	let response = (meta.step === 1) ? `**PREFIX**\
	\nThe bots default prefix is \`${process.env.PREFIX}\`.\
	\nYou'll have to use that prefix any time you use commands in my DM.\
	\nYou can also tag me instead of using a prefix in both DM and in guilds.\
	\n\n**Reply with your desired prefix.**`:
	`<:Yes:588844524177195047> Successfully set prefix to \`${reply}\`.`;
	if(meta.step===2) meta.run = true;
	
	if (meta.step === 2) {
		doc.prefix = reply;
		meta.step++;
	} else meta.step++;

	return send(msg, doc, meta, response, (meta.step === 2) ? prefix : permission);
}

async function permission(msg, doc, meta, reply) {
	// This function is re-used for setting Moderator as well.
	let response,
		cb;

	if (meta.step === 3 || meta.step === 9) {
		let md = String();
		if(doc.moderator.value==="NONE") md = "Unset. There was no ideal default.";
		else if (!checkRoleExist(msg, doc, "moderator")) md = "Unset. The previous role no longer exist."
		else md = `Mods must have **${roleTag(doc.moderator.value)}** ${(doc.moderator.type==="role")?"":"*or higher* "}to be considered moderators.`;
		
		let prm = String(),
			_ = msg.guild.roles.find(r => r.id === doc.permission.value);
		if (!checkRoleExist(msg, doc, "permission")) prm = "Unset. The previous role no longer exist.";
		else if (_.name === "@everyone" && _.position===0) prm = "**Everyone** has access to use bot.";
		else prm = `Users must have **${roleTag(doc.permission.value)}** ${(doc.permission.type==="role")?"":"*or higher* "}to use bot.`;

		response = (meta.step === 3) ?
			`**PERMISSIONS**\
			\nYou will now decide the permission users need to use the normal features of the bot.\
			\n> ~~                                                                                 ${(doc.permission.type==="role")?"":"                       "}~~\
			\n> **Current:** ${prm}\
			\n> **Role ID:** \`${doc.permission.value}\` ${(checkRoleExist(msg, doc, "permission")===null)?"*(deleted)*":""}\
			\n> ~~                                                                                 ${(doc.permission.type==="role")?"":"                       "}~~\
			\n**Options**\
			\nThere's two options for permissions:\
			\n•    Users need *a specific* role to use the commands\
			\n•    Users need a specific role *or higher* to use the commands\
			\n\n**Reply with…**\
			\n•    \`next\` if these settings are fine\
			\n•    \`no\` if they are not`:
			`**MODERATORS**\
			\nYou are now going to set a moderator permission for the bot. This bot does not do guild moderation. This setting is for upcomming features you want only staff to have access to.\
			\n> ~~                                                                                 ${(doc.moderator.type==="role")?"":"                       "}~~\
			\n> **Current:** ${md}\
			\n> **Role ID:** \`${(doc.moderator.value!=="NONE")?doc.moderator.value:"None"}\`\
			\n> ~~                                                                                 ${(doc.moderator.type==="role")?"":"                       "}~~\
			\n**Options**\
			\nThere's two options for permissions:\
			\n•    Users need *a specific* role to use the commands\
			\n•    Users need a specific role *or higher* to use the commands\
			\n\n**Reply with…**\
			\n•    \`next\` if current settings are fine\
			\n•    \`no\` if they are not`;
		meta.step++;
		cb=permission;
	} else if (meta.step === 4 || meta.step === 10) {
		if (reply === "next") {
			cb = (meta.step === 4) ? permission : channels;
			meta.step = (meta.step === 4) ? 9 : 15;
			meta.run = true;
		} else if (reply === "no") {
			meta.run = true;
			meta.step++;
			cb = permission;
		} else {
			response = "<:Stop:588844523832999936> `" + reply + "` is not a valid reply.\
			\n\n**Reply with…**\
			\n•    \`next\` if current settings are fine\
			\n•    \`no\` if they are not";
			cb = permission;
		}
	} else if (meta.step === 5 || meta.step === 11) {
		response = (meta.step === 5) ?
			`**PERMISSIONS**\
			\nAlright, first decide the **mode for the role** you are about to set.\
			\n**Reply with…**\
			\n•    \`role\` to make people need a specific role\
			\n•    \`inherit\` to make people need a specific role or higher\
			\n•    \`everyone\` to make commands available to everyone`:
			`**MODERATORS**\
			\nAlright, first decide the **mode for the role** you are about to set.\
			\n**Reply with…**\
			\n•    \`role\` to make people need a specific role\
			\n•    \`inherit\` to make people need a specific role or higher`;
		cb = permission;
		meta.step++;
	} else if (meta.step === 6 || meta.step === 12) {

		if (reply === "inherit" || reply === "role" || (meta.step === 6 && reply === "everyone")) {
			let type = (reply === "everyone") ? "inherit" :
				(reply === "role") ? "role" : "inherit";

			if (reply === "everyone") {
				let value = await findRole("everyone")
					.catch(err => {
						return handleErr(err, msg, doc, meta);
					});
				// Perms set for "everyone":
				doc.permission.type = type;
				doc.permission.value = value;

				meta.step = 9;
				response = "<:Yes:588844524177195047> **Everyone** has been granted permission to use the bot.";
				meta.run = true;
			} else {
				doc[(meta.step===6)?"permission":"moderator"].type = type;
				response = `<:Yes:588844524177195047> ${(meta.step === 6)?"Permission":"Moderator"} mode set to **${type}**.`;
				meta.step++;
				meta.run = true;
			}
		} else response = `<:Stop:588844523832999936> \`${reply}\` is not a valid reply.\
			\n**Reply with…**\
			\n•    \`role\` to make people need a specific role\
			\n•    \`inherit\` to make people need a specific role or higher\
			${(meta.step===6)?`\n•    \`everyone\` to make commands available to everyone`:""}`;
		cb = permission;
	} else if (meta.step === 7 || meta.step === 13) {
		response = `… and now which role to apply that mode to?\
		\n**Reply with…**\
		\n•    A role ID, role name, or mention the role`;
		meta.step++;
		cb = permission;
	} else if (meta.step === 8 || meta.step === 14) {
		let role = await findRole(reply, (meta.step!==8))
			.catch(err => {
				return handleErr(err, msg, doc, meta);
			});
		
		if(role === false) {
			response = `<:Stop:588844523832999936> Not allowed to give everyone moderator permission.`;
			cb = permission;
		}
		else if (role === null) {
			response = `<:Stop:588844523832999936> Could not find a role \`${reply}\`.\
			\n**Reply with…**\
			\n•    A role ID, role name, or mention the role`;
			cb = permission;
		} else {
			doc[(meta.step===8)?"permission":"moderator"].value = role;
			response = `<:Yes:588844524177195047> ${(meta.step===8)?"Permission":"Moderator"} set to **${doc[(meta.step===8)?"permission":"moderator"].type}** for **${roleTag(role)}**.`;
			cb = (meta.step === 8) ? permission : channels;
			meta.run = true;
			meta.step++;
		}
	}

	return send(msg, doc, meta, response, cb);
}

async function channels(msg, doc, meta, reply) {
	let response,
		cb;
	if (meta.step === 15) {
		response = `**CHANNELS**\
		\nYou can toggle bot usage in specific channels.\
		\n•    Checking and enabling channels bypass the fact that the channel is disabled.\
		\n•    If you do not skip this, all channels will be reset to enabled.\
		\n\n**Reply with…**\
		\n•    \`next\` to skip disabling channels\
		\n•    A space separated list of channel #mentions, names, or ID's to disable`;
		meta.step++;
		meta.channelsReset = false;
		cb=channels;
	}

	else if (meta.step === 16) {
		if (reply === "next") {
			// Skip to disabling commands
			cb = commands;
			meta.run = true;
			meta.step++;
		} else {
			if(!meta.channelsReset) {
				for (let ch in doc.enabledChannels) {
					doc.enabledChannels[ch]=true;
				}
				meta.channelsReset=true;
			}
			// Detect channels
			let chans = reply.replace(/, +| +/g, " ").split(" ");
			let channelIds = Array();

			chans.forEach(channel => {
				if (/^\d{16,30}$/.test(channel)) channelIds.push(channel);
				else if (/^<#\d{16,30}>$/.test(channel)) channelIds.push(channel.replace(/<|#|>/g, ""));
				else {
					let _ = msg.guild.channels.find(ch => ch.name === channel.toLowerCase());
					if (_ !== null) channelIds.push(_.id);
				}
			});

			let notAll = (chans.length !== channelIds.length);
			channelIds = removeDupes(channelIds);

			response = "**Processed**";
			if (notAll) response += "\nUnfortunately I couldn't find all of the channels you listed, but I've done these:";

			if (channelIds.length === 0) response = "It appears none of the channels you gave were valid.\n\n**Reply with…**\
					\n•    `next` to wrap up channel disabling and move on\
					\n•    more channels to disable";
			else {
				channelIds.forEach(channel => {
					response += `\n•    <#${channel}> disabled.`;
					try {
						doc.enabledChannels[channel] = false;
					} catch {
						notAll = true;
						channelIds = channelIds.slice(channelIds.indexOf(channel), 1);
						//! No idea if this will cause error, as it removes from an array it is iterating over.
					}
				});
				response += "\n\n**Reply with…**\
				\n•    `next` to wrap up channel disabling and move on\
				\n•    … more channels to disable";
			}
			cb=channels;
		}
	}

	return send(msg, doc, meta, response, cb);
}

async function commands(msg, doc, meta, reply) {
	let response;

	if (meta.step === 17) {
		response = `**COMMANDS**\
		\nIf there's certain commands you don't want users to have access to, you can disable them. Disabling a command will make the bot ignore *anyone* who tries to use it.\
		\n•    You can disable *any* commands…\
		\n•    … except Moderator commands or higher, e.g. the \`settings\` command.\
		\n•    If you do not skip this, all commands will be reset to enabled.\
		\n\n**Reply with…**\
		\n•    \`done\` to finish up and save\
		\n•    \`commands\` to see all available commands\
		\n•    A space separated list of commands to disable`;
		meta.step++;
		meta.commandsReset = false;
	} else if (meta.step === 18) {

		if (reply === "done") {
			meta.run = true;
			meta.step++;
			let saved = await save(msg, doc, meta);
			if(saved) return summary(msg, doc, meta);
			else return msg.channel.send("<:Stop:588844523832999936> I had to stop, and could not save the progress.\n");
		}

		else if (reply === "commands") {
			//========================================
			response = "**Commands available for users:**";
			for (let command in msg.client.commands) {
				if (msg.client.commands[command].permissionLevel & ACCESS.user) response += `\n• ${command}`;
			}
			//=======================================
		} else {
			if (!meta.commandsReset) {
				for (let cmd in doc.enabledCommands) {
					doc.enabledCommands[cmd] = true;
				}
				meta.commandsReset = true;
			}
			// Disable the commands:
			response = "**Processed**";

			let cmds = removeDupes(reply.replace(/,|, +| +/g, " ").split(" "));
			let _c = Array();

			await asyncForEach(cmds, async cmd => {
				let _ = fn.alias(msg.client.commands, cmd);
				if (_ !== null) _c.push(_);
			});

			if (_c.includes("settings")) {
				_c.splice(_c.indexOf("settings"), 1);
				response += "\n*Note: Skipped `settings` command — it cannot be disabled.*";
				meta.bool = true;
			}

			if (_c.length === 0) response = "None of the commands you gave were valid.";

			else {
				// If a command was removed (neg value) and "settings" wasn't one of them:
				let i = (meta.bool)?cmds.length-1:cmds.length;
				if (_c.length - i !== 0) response += "\nUnfortunately I couldn't find all of the commands you listed, but I've done these:";

				_c.forEach(cmd => {
					response += `\n•    **${cmd}** disabled.`;
					doc.enabledCommands[cmd] = false;
				});
				meta.bool = false;
			}
		}

		// Always end with this anyway
		response += "\n\n**Reply with…**\
		\n•    \`done\` to finish up and save\
		\n•    \`commands\` to see all available commands\
		\n•    A space separated list of commands to disable"
	}
	return send(msg, doc, meta, response, commands);
}

async function summary(msg, doc, meta) {
	clearTimeout(t);
	clearTimeout(tt);
	delete msg.client.locks[msg.guild.id];

	let isEveryoneRole = false,
		roleExist = {
			mod: true,
			perm: true
		};
	try {
		isEveryoneRole = (msg.guild.roles.find(r=>r.id===doc.permission.value).position === 0);
	} catch {}

	roleExist.mod = (msg.guild.roles.find(r => r.id === doc.moderator.value))?true:false;
	roleExist.perm = (msg.guild.roles.find(r => r.id === doc.permission.value))?true:false;

	meta.step++;
	let response = "**SUMMARY**"
	response += `\nPrefix is \`${doc.prefix}\`.\n`;
	response += "**\nPermissions:**";
	response += (!roleExist.perm)?"\n**Role does not exist**. As a result, **everyone** can use the bot.":(isEveryoneRole)?"\n**Everyone** can use the bot.":(doc.permission.type == "inherit") ? `\nEveryone *with and above* **${roleTag(doc.permission.value)}** can use the bot.` :
		`\nUsers need to have the **${roleTag(doc.permission.value)}** role to use the bot.`;
	response += "**\n\nModerator:**";
	response += (!roleExist.mod)?"\n**Role does not exist**. As a result, user must have **Adminiastrator permission**.":(doc.moderator.value==="NONE")?"\n**Moderator not set.** User must be Administrator to use moderator commands.":(doc.moderator.type == "inherit") ? `\nAnyone *with and above* the **${roleTag(doc.moderator.value)}** role is considered bot moderator.` :
		`\nAnyone with **${roleTag(doc.moderator.value)}** role is considered bot moderator.`;

	if (Object.values(doc.enabledChannels).includes(false)) response += "\n\n**Channels:**";
	for (let channel in doc.enabledChannels) {
		if (!doc.enabledChannels[channel]) response += `\n•    <#${channel}> disabled.`;
	}
	if (Object.values(doc.enabledCommands).includes(false)) response += "\n\n**Commands:**";
	for (let cmd in doc.enabledCommands) {
		if (!doc.enabledCommands[cmd]) response += `\n•    **${cmd}** disabled.`;
	}

	return msg.channel.send(response);
}

function checkRoleExist(msg, doc, target) {
	return msg.guild.roles.find(role => role.id === doc[target].value);
}

async function save(msg, doc, meta) {
	return new Promise(resolve => {
		db.findOne({
			_id: msg.guild.id
		}, async (err, d) => {
			if (err) {
				console.error(`[${Date()}] Error: init command.SAVE → Guild: ${msg.guild.name} (${msg.guild.id}). User: ${msg.author.username} (${msg.author.id}). Meta: ${meta}. ERROR:`, err);
				return resolve(false);
			}
			try {
				if (d.prefix !== doc.prefix) {
					d.prefix = doc.prefix;
					d.markModified("prefix");
					d.markModified()
				}
				if (d.permission.value !== doc.permission.value) {
					d.permission.value = doc.permission.value;
					d.markModified("permission.value");
				}
				if (d.permission.type !== doc.permission.type) {
					d.permission.type = doc.permission.type;
					d.markModified("permission.type");
				}
				if (d.moderator.value !== doc.moderator.value) {
					d.moderator.value = doc.moderator.value;
					d.markModified("moderator.value");
				}
				if (d.moderator.type !== doc.moderator.type) {
					d.moderator.type = doc.moderator.type;
					d.markModified("moderator.type");
				}
				d.completedSetup = true;

				for (let cmd in doc.enabledCommands) {
					if (!doc.enabledCommands[cmd]) d.enabledCommands[cmd] = false;
				}
				for (let ch in doc.enabledChannels) {
					if (!doc.enabledChannels[ch]) d.enabledChannels[ch] = false;
				}
				d.markModified("enabledCommands");
				d.markModified("enabledChannels");
			} catch (err) {
				console.error(`[${Date()}] Error: init command.TRY → Guild: ${msg.guild.name} (${msg.guild.id}). User: ${msg.author.username} (${msg.author.id}). Meta: ${JSON.stringify(meta)}. ERROR:`, err);
				return resolve(false);
			}
			// Save cache first as it's less likely to fail.
			RedisDB.hset("serverPrefixes", msg.guild.id, doc.prefix, err => {
				if (err) {
					console.error(`[${Date()}] Error: init command.SAVE.REDIS → Error setting newprefix ${doc.prefix} for server ${msg.guild.id}:`, err);
					return resolve(false);
				} else {
					d.save(err => {
						if (err) {
							console.error(`[${Date()}] Error: init command.SAVE.REDIS.DB → Guild: ${msg.guild.name} (${msg.guild.id}). User: ${msg.author.username} (${msg.author.id}). Meta: ${JSON.stringify(meta)}. ERROR:`, err);
							// Re-set prefix since it failed.
							RedisDB.hset("serverPrefixes", msg.guild.id, d.prefix, err => {
								if(err) {
									console.error(`[${Date()}] Error: init command.SAVE.REDIS.DB.REDIS → Error setting newprefix ${doc.prefix} for server ${msg.guild.id}:`, err);
									return resolve(false);
								} else return resolve(false);
							});
						}
						// All things good!
						return resolve(true);
					});
				}
			});
		});
	});
}