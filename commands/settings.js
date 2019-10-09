const {alias} = require("../util/command-utilities"),
	{changeServerPrefix,getPrefix} = require("../util/redis"),
	fn = require("../util/response_functions");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "settings",
	aliases: ["config", "setting"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.admin,
	dm:false,
	daccess: [],
	desc: "Get and set the bot settings for this server. Roles and channels can be defined by name *(case-insensitive)*, ID, or by tag.",
	async exec(msg, cmd, args, doc) {
		if(args.length === 0) {
			msg.channel.send("**No argument(s):** Valid ones are \`prefix\`, \`channel\`, \`command\`, \`moderator\`, and \`permission\`.");
			return;
		}
		doc = await fn.get_doc(msg.guild);
		if(args[0] === "prefix") {
			prefix(msg, args, doc);
		} else if (args[0] === "channel") {
			channel(msg, args, doc);
		} else if (args[0] === "command" || args[0] === "cmd") {
			command(msg, args, doc);
		} else if(args[0] === "moderator" || args[0] === "mod") {
			moderator(msg, args, doc);
		} else if(args[0] === "permission" || args[0] === "perm") {
			permission(msg, args, doc);
		} else {
			msg.channel.send(`**Invalid argument:** ${args[0]} is not a valid argument. Valid ones are \`prefix\`, \`channel\`, \`command\`, \`moderator\`, and \`permission\`.`);
		}
	},
	help(msg, cmd, args, doc) {
		if(args.length === 1) {
			// The response for help on this command.
			(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField("Description", "Get and set the bot settings for this server. \nRoles and channels can be defined by ID, mention, or by name *(case-insensitive)*.")
				.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
				.addField("Aliases", `${this.aliases.join(", ")}`, true)
				.addField("Usage", `\`${doc.prefix}setting <argument> [options]\``, true)
				.addField("Valid arguments", "`prefix`\n`command`\n`channel`\n`moderator`\n`permission`", true)
				.addField("Information", `To get informationed one of the valid arguments, use \`${doc.prefix}setting ? <argument>\`.`)
				.addField("Examples", `For a list of usage examples, do \`${doc.prefix}setting ? exmaples\`.`);
			msg.channel.send(embed);
		} else {
			if (args[1] === "prefix") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Usage", `\`${doc.prefix}setting prefix [prefix]\``)
					.addField("Examples", `\`${doc.prefix}setting prefix\` → Gets current prefix\n\`${doc.prefix}setting prefix +\` → Sets prefix to \`+\``);
				msg.channel.send(embed);
			}
			else if (args[1] === "channel") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Usage", `\`${doc.prefix}setting channel [channel|"enable"|"disable", [channel]]\``, true)
					.addField("Channel", `\`${doc.prefix}setting channel <\"enable\"|\"disable\">\` → Enables or disables the current channel.\n\
					\`${doc.prefix}setting channel <channel>\` → Gets if target channel is enabled or disabled.\n\
					\`${doc.prefix}setting channel <\"enable\"|\"disable\"> <channel>\` → Enables or disables the channel.`, true)
					.addField("Examples", `\
					\`${doc.prefix}setting channel\` → Checks if current channel is enabled or disabled *(bypasses if disabled)*.\n\
					\`${doc.prefix}setting channel disable\` → Disables current channel.\n\
					\`${doc.prefix}setting channel general\` → Checks if a different channel named "general" is enabled or disabled.\n\
					\`${doc.prefix}setting channel enable general\` → Enables a different channel named "general".`)
				msg.channel.send(embed);
			}
			else if (args[1] === "command" || args[1] === "cmd") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Usage", `\`${doc.prefix}setting command <command|<"enable"|"disable" <command>>\``, true)
					.addField("Command", `\`${doc.prefix}setting command <command>\` → Gets if the command is enabled or disabled.\n\
					\`${doc.prefix}setting command <\"enable\"|\"disable\"> <command>\` → Enables or disables the command.`, true)
					.addField("Examples", `\`${doc.prefix}setting command disable watermark\` → Disables the \`watermark\` command.\n\`${doc.prefix}setting command watermark\` → Checks if the \`watermark\` command is enabled or disabled.`)
				msg.channel.send(embed);
			}
			else if (args[1] === "moderator" || args[1] === "mod") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Usage", `\`${doc.prefix}setting moderator ["role"|"inherit" [guild role]]\`.\n*A mod has no purpose yet, it's for upcomming feature(s).*`, true)
					.addField("Moderator", `\`${doc.prefix}setting moderator\` → Gets information regarding what is considered the modarator role *(mode and role)*.\n\
					\`${doc.prefix}setting moderator <\"role\"|\"inherit\">\` → Sets moderator role to be exclusive to the role, or let roles above it *(in Server Settings → Roles)* inherit, meaning they also are considered bot moderators.\n\
					\`${doc.prefix}setting moderator <\"role\"|\"inherit\"> <role>\` → Sets moderator role mode on the target role.`, true)
				msg.channel.send(embed);
			}
			else if (args[1] === "permission" || args[1] === "perm") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Usage", `\`${doc.prefix}setting permission ["everyone"|"role"|"inherit" [guild role]]\`.\nSets what roles are needed to use the bot. Say "everyone" to allow everyone.`, true)
					.addField("Permission", `\`${doc.prefix}setting permission\` → Gets information regarding who can use the bot *(mode and role)*.\n\
					\`${doc.prefix}setting permission <\"everyone\"|\"role\"|\"inherit\">\` → Sets the useage role to be exclusive to the role, or let roles above it *(in Server Settings → Roles)* inherit, meaning they also are allowed to use the bot.\n\
					\`${doc.prefix}setting permission <\"role\"|\"inherit\"> <role>\` → Sets allow role mode on the target role.`, true)
				msg.channel.send(embed);
			}
			else if (args[1] === "examples") {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Examples", `\`${doc.prefix}setting prefix\` gets server prefix.\n\
					\`${doc.prefix}setting permission\` gets what role(s) can use the bot in general.\n\
					\`${doc.prefix}setting permission inherit\` sets the role mode to inherit, letting anyone in the role that is already set and above use the bot.\n\
					\`${doc.prefix}setting command disable ppi\` disables the PPI command on the server, making bot fully ingnore anyone who uses the command.\n\
					\`${doc.prefix}setting command ppi\` checks if the \`ppi\` command is enabled or disabled.\n\
					\`${doc.prefix}setting channel disable\` disables bot in the channel you're in.\n\
					\`${doc.prefix}setting channel\` gets if channel is disabled or not. This one command bypasses all ignores/disables.\n\
					\`${doc.prefix}setting channel enable general\` enables a channel that goes by the name 'general'.`, true);
					
				msg.channel.send(embed);
			} else {
				msg.channel.send("**Invalid argument:** Valid ones are `prefix`, `channel`, `command`, `moderator`, `permission`, and `examples`.");
			}
		}
	}
};

/**
 * Performs a doc.save()
 * @param {Object} msg The original message object
 * @param {Object} document The document to save
 * @param {String} errorMessage A message to tell the user if an error occurred
 * @param {String} message Message to sent to channel on success
 * @param {String} consoleErrorMessage An optional console error message to set
 */
function save(msg, document, mixer, errorMessage, message, consoleErrorMessage, successConsole) {
	if(mixer) document.markModified(mixer);
	document.save(err => {
		if(err) {
			if(errorMessage) msg.channel.send(errorMessage);
			console.error(`[${Date()}] ${(consoleErrorMessage) ? consoleErrorMessage : errorMessage}`, err);
			return;
		}
		if(message) msg.channel.send(message);
		if (successConsole) console.log(`[${Date()}] ` + successConsole);
		return;
	});
}
async function prefix(msg, args, doc) {
	if(args.length === 1) {
		//* +setting prefix
		// Gets the current server's prefix
		let prefix = await getPrefix(msg);
		msg.channel.send(`**Current settings:** Prefix is \`${prefix}\``);
	} else {
		//* +setting prefix <prefix>
		// Sets the current server's prefix
		changeServerPrefix(msg.guild.id, args[1], err => {
			if(err) {
				fn.notifyErr(msg.client, err);
				msg.cahnnel.send(`An unknown error occured. Try again later. The prefix remains \`${doc.prefix}\`.`);
				return;
			} else {
				doc.prefix = args[1];
				save(msg, doc, "prefix", "An error occurred trying to save the prefix.", "Successfully changed prefix to `"+args[1]+"`", `Error saving prefix ${args[1]} for server ${msg.guild.id}`);
			}
		});
	}
	return;
}
function channel(msg, args, doc) {
	let guildChannels = msg.guild.channels.map(channel => {
		if (channel.type === "text") return channel.id;
	});
	/**
	 * SUBFUNCTIONS:
	 * 1. +setting channel 					→ get channel enable/disabled
	 * 2. +setting channel /id/				→ get channel enable/disabled
	 * 3. +setting channel enable			→ enables current channel
	 * 4. +setting channel disable			→ disables current channel
	 * 5. +setting channel enable /id/ 		→ enables channel
	 * 6. +setting channel disable /id/		→ disables channel
	 */
	if(args.length === 1) {
		//* +setting channel
		//1. get channel enable/disabled

		// Current channel exist in doc?
		hasChannel(msg.channel.id, (enabled, channel) => {
			if(enabled) {
				msg.channel.send("This channel is **enabled**.");
			} else {
				msg.channel.send("This channel is **disabled**.");				
			}
		}, channel => {
			msg.channel.send("This channel is **enabled**.");
			doc.enabledChannels[channel] = true;
			save(msg, doc, "enabledChannels", null, null, `serverSettings → Error trying to add new channel ${channel} for server ${msg.guild.id}.`, `Successfully added new channel ${channel} to serverSettings for ${msg.guild.id}.`);
		});
	} //! END 1. +setting channel

	else if (args.length === 2 && !(args[1]==="on"||args[1]==="off"||args[1]==="enable"||args[1]==="disable")) {
		//* +setting channel /id/
		//2. get channel enable/disabled for target channel

		// Trying to get channel ID by pure ID.
		if(/^\d+$/.test(args[1])) {
			// Is it even a channel in this server?
			if (guildChannels.indexOf(args[1]) === -1) {
				msg.channel.send("**Invalid argument:** Could not find a channel by that ID.");
				return;
			}
			// Valid, execute.
			doneChannel(args[1]);
		}

		// Trying to get channel by tag
		else if (/^<#(\d+)>$/.test(args[1])) {
			args[1] = args[1].slice(2, -1);
			// Is it even a channel in this server?
			if (guildChannels.indexOf(args[1]) === -1) {
				msg.channel.send("**Invalid argument:** Could not find a channel by that ID.");
				return;
			}
			// Valid, execute.
			doneChannel(args[1]);
		}

		// Trying to get channel by name
		else {
			let channelsObj = Object();
			msg.guild.channels.map(ch => {
				if(ch.type === "text") {
					channelsObj = {...channelsObj, [ch.name.toLowerCase()]:ch.id};
				}
			});

			if(channelsObj.hasOwnProperty(args[1])) {
				// Valid, execute.
				doneChannel(channelsObj[args[1]]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a channel by the name \`${args[1]}\`.`);
			}
		}

		function doneChannel(channelId) {
			hasChannel(channelId, (enabled, channel) => {
				if(enabled) {
					msg.channel.send(`The channel <#${channel}> is **enabled**.`);
				} else {
					msg.channel.send(`The channel <#${channel}> is **disabled**.`);
				}
			}, channel => {
				msg.channel.send(`The channel <#${channel}> is **enabled**.`);
				doc.enabledChannels[channel] = true;
				save(msg, doc, "enabledChannels", null, null, `serverSettings → Error trying to add new channel ${channel} for server ${msg.guild.id}.`, `Successfully added new channel ${channel} to serverSettings for ${msg.guild.id}.`);
			});
		}
	} //! END 2. +setting channel /id/

	else if ((args[1] === "enable" || args[1] === "on" || args[1] === "disable" || args[1] === "off") && args.length === 2) {
		//* +setting channel enable/disable
		//3. 4. Enables / disables current channel

		let value = (args[1] === "enable" || args[1] === "on") ? true : false;
		let reply = (value) ? "Successfully **enabled** this channel." : "Successfully **disabled** this channel.";
		doc.enabledChannels[msg.channel.id] = value;
		save(msg, doc, "enabledChannels",
			`An error occurred trying to ${(value)?"enable":"disable"} channel ${msg.channel.id} in server ${msg.guild.id}.`,
			reply,
			`serverSettings → Error trying to ${(value)?"enable":"disable"} channel ${msg.channel.id} in ${msg.guild.id}.`);
	} //! END 3 & 4. +setting channel enable / disable

	else if ((args[1] === "enable" || args[1] === "on" || args[1] === "disable" || args[1] === "off") && args.length === 3) {
		//* +setting channel enable/disable /targ/
		//5. 6. Enables / disables target channel

		// Trying to get channel ID by pure ID.
		if(/^\d+$/.test(args[2])) {
			// Is it even a channel in this server?
			if (guildChannels.indexOf(args[2]) === -1) {
				msg.channel.send("**Invalid argument:** Could not find a channel by that ID.");
				return;
			}
			// Valid, execute.
			doneChannel(args[2]);
		}

		// Trying to get channel by tag
		else if (/^<#(\d+)>$/.test(args[2])) {
			args[2] = args[2].slice(2, -1);
			// Is it even a channel in this server?
			if (guildChannels.indexOf(args[2]) === -1) {
				msg.channel.send("**Invalid argument:** Could not find a channel by that ID.");
				return;
			}
			// Valid, execute.
			doneChannel(args[2]);
		}

		// Trying to get channel by name
		else {
			let channelsObj = Object();
			msg.guild.channels.map(ch => {
				if(ch.type === "text") {
					channelsObj = {...channelsObj, [ch.name.toLowerCase()]:ch.id};
				}
			});

			if(channelsObj.hasOwnProperty(args[2])) {
				// Valid, execute.
				doneChannel(channelsObj[args[2]]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a channel by the name \`${args[2]}\`.`);
			}
		}

		function doneChannel(channelId) {
			let value = (args[1] === "enable" || args[1] === "on") ? true : false;

			// Is it already enabled/disabled?
			if(doc.enabledChannels[channelId] === value) {
				msg.channel.send(`<#${channelId}> is already ${(value)?"enabled":"disabled"}.`);
				return;
			}

			let reply = (value) ? `Successfully **enabled** the bot in <#${channelId}>.` : `Successfully **disabled** the bot in <#${channelId}>.`;
			doc.enabledChannels[channelId] = value;
			save(msg, doc, "enabledChannels",
				`An error occurred trying to ${(value)?"enable":"disable"} the bot in that channel.`,
				reply,
				`serverSettings → Error trying to set ${value} on channel ${channelId} in server ${msg.guild.id}.`
				);
		}
	} //! END 5 & 6. +setting channel enable / disable

	return;
	//* HELPER FUNCTION.
	/**
	 * Checks if document has current channel and if enabled
	 * @param {String} channelId The target channel ID
	 * @param {Function} callback If the channel exist.
	 * @param {Function} callback If channel doesn't exist
	 * @param {Object} targetOverride A target to override hasOwnProperty of.
	 * @returns {Function|Boolean} Callback and/or boolean
	 */
	function hasChannel(targetChannel, yes, no, targetOverride) {
		let target = (targetOverride) ? targetOverride : doc.enabledChannels;
		if (target.hasOwnProperty(targetChannel)) {
			yes((target[targetChannel] === true), targetChannel);
		} else {
			no(targetChannel);
		}
	}
}
function command(msg, args, doc) {
	// TODO: Do something about alias here.
	if (args.length === 2 && !(args[1]==="on"||args[1]==="off"||args[1]==="enable"||args[1]==="disable")) {
		//* +setting command /cmd/
		//2. get if a command is enabled or disabled

		// Is it even a valid command?
		let realCmd = alias(msg.client.commands, args[1]);
		if (realCmd === null) {
			msg.channel.send(`**Invalid argument:** Could not find a command by the name ${args[1]}.`);
			return;
		}

		if (doc.enabledCommands.hasOwnProperty(realCmd)) {
			let value = doc.enabledCommands[realCmd];
			msg.channel.send(`\`${realCmd}\` is **${(value)?"enabled":"disabled"}**.`);
		} else {
			msg.channel.send(`\`${realCmd}\` is **enabled**.`);
			doc.enabledCommands[realCmd] = true;
			save(msg, doc, "enabledCommands",
				null, null, `serverSettings → Error adding the command ${realCmd} to server ${msg.guild.id}.`);
		}
		return;
	} //! END 2. +setting command /cmd/

	else if ((args[1] === "enable" || args[1] === "on" || args[1] === "disable" || args[1] === "off") && args.length === 3) {
		//* +setting channel enable/disable /cmd/
		//3. 4. Enables / disables a command

		// Is it even a valid command?
		let realCmd = alias(msg.client.commands, args[2]);
		if (realCmd === null) {
			msg.channel.send(`**Invalid argument:** Could not find a command by the name ${args[2]}.`);
			return;
		}

		// Is it a high level perm command?
		if(msg.client.commands[realCmd].permissionLevel & (parseInt(ACCESS.mod)+parseInt(ACCESS.admin)+parseInt(ACCESS.community)+parseInt(ACCESS.premium)+parseInt(ACCESS.dev)+parseInt(ACCESS.owner))) {
			msg.channel.send("**Invalid argument:** Cannot disable moderator commands and higher.");
			return;
		}

		let value = (args[1] === "enable" || args[1] === "on") ? true : false;
		let reply = (value) ? `Successfully **enabled** the \`${realCmd}\` command.` : `Successfully **disabled** the \`${realCmd}\` command.`;
		doc.enabledCommands[realCmd] = value;
		save(msg, doc, "enabledCommands",
			`An error occurred trying to ${(value)?"enable":"disable"} the command.`,
			reply, `serverSettings → Error trying to ${(value)?"enable":"disable"} command ${realCmd} in ${msg.guild.id}.`);
	} //! END 3 & 4. +setting channel enable / disable

	else {
		msg.channel.send("**Invalid argument:** Use `+setting command [\"enable\"|\"disable\"] <command>` to see if a command is enabled/disabled, or to enable/disable a command.");
	}
}
function moderator(msg, args, doc) {
	let guildRoles = Object();
	msg.guild.roles.map(role => {
		guildRoles = {...guildRoles, [role.name.toLowerCase()]:role.id};
	});

	function roleTag(roleId) {
		for (let role in guildRoles) {
			if (roleId === guildRoles[role]) {
				role = role.replace("@", "");
				return role;
			}
		}
	}

	if(args.length === 1) {
		//* +setting mod
		// See information regarding moderator role
		if (doc.moderator.value === "NONE") {
			return msg.channel.send("There's no Moderator role set.");
		} else if (roleTag(doc.moderator.value) === null) {
			return msg.channel.send("The previous Moderator role must have been deleted, now nobody is Moderator!");
		}

		if (doc.moderator.type === "role") {
			msg.channel.send(`**Current settings:** Members must have the **${roleTag(doc.moderator.value)}** role to be considered a moderator.`);
		} else {
			msg.channel.send(`**Current settings:** Anyone with and above **${roleTag(doc.moderator.value)}** *(in Server Settings → Roles)* is considered a moderator.`);
		}
		return;
	} //! END +setting mod

	else if (args.length === 2 && (args[1] === "role" || args[1] === "inherit")) {
		//* +setting mod [type]
		// Set a mod role to be exlusive or inherit

		if(doc.moderator.value === "NONE") {
			return msg.channel.send("**Invalid:** There's no Moderator role set.");
		}

		// Is it already that?
		if (doc.moderator.type === args[1]) {
			msg.channel.send(`Permission type is already set to \`${args[1]}\`.`);
			return;
		}

		doc.moderator.type = args[1];
		save(msg, doc, "moderator",
			"An error occurred trying to change the role type.",
			`Successfully set the moderator role to ${(args[1]==="role")?"be limited to the role **"+roleTag(doc.moderator.value):"inherit above the role **"+roleTag(doc.moderator.value)}**.`,
			`serverSettings → Error trying to set role type ${args[1]} in server ${msg.guild.id}.`
		);
	} //! END +setting mod [mode]

	else if (args.length === 3 && (args[1] === "role" || args[1] === "inherit")) {
		//* +setting mod [type] [role]
		// Set a mod role and the type

		// Get role by pure ID
		if(/^(\d+)$/.test(args[2])) {
			if (Object.values(guildRoles).indexOf(args[2]) !== -1) {
				doneRole(args[2]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the ID \`${args[2]}\``);
				return;
			}
		}

		// Get role by tag
		else if (/^<@&(\d+)>$/.test(args[2])) {
			let id = args[2].slice(3,-1);
			if (Object.values(guildRoles).indexOf(id) !== -1) {
				doneRole(id);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the ID \`${id}\``);
				return;
			}
		}

		// Get role by name
		else {
			if (guildRoles.hasOwnProperty(args[2])) {
				doneRole(guildRoles[args[2]]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the ID \`${args[2]}\``);
				return;
			}
		}

		function doneRole(value) {
			// Is it already that?
			if (doc.moderator.type === args[1] && doc.moderator.value === value) {
				msg.channel.send(`Permission type is already set to \`${args[1]}\` for **${roleTag(value)}**.`);
				return;
			}

			doc.moderator.type = (args[1]);
			doc.moderator.value = value;
			save(msg, doc, "moderator",
				"An error occurred trying to set the moderator.",
				`Successfully set the moderator role to ${(args[1]==="role")?"be limited to the role **"+roleTag(value):"inherit above the role **"+roleTag(value)}**.`,
				`serverSettings → Error trying to set role type ${args[1]} and role ${value} in server ${msg.guild.id}.`
			);
			return;
		}
	} //! END +setting mod [type] [role]
	else {
		msg.channel.send("**Invalid argument:** Valid arguments are:\n`+setting mod`\n`+setting mod <\"role\"|\"inherit\">`\n`+setting mod <\"role\"|\"inherit\"> <role>`");
	}
}
function permission(msg, args, doc) {
	let guildRoles = Object();
	msg.guild.roles.map(role => {
		guildRoles = {...guildRoles, [role.name.toLowerCase()]:role.id};
	});

	function roleTag(roleId) {
		for (let role in guildRoles) {
			if (roleId === guildRoles[role]) {
				role = role.replace("@", "");
				return role;
			}
		}
	}

	if(args.length === 1) {
		//* +setting user
		// See information regarding user role
		if (roleTag(doc.permission.value) === undefined) {
			return msg.channel.send("The previous role must have been deleted. Everyone now has access to use the bot.");
		}

		if (doc.permission.type === "role") {
			msg.channel.send(`**Current settings:** Members must have the **${roleTag(doc.permission.value)}** *(\`${doc.permission.value}\`)* role to be allowed to use the bot.`);
		} else {
			msg.channel.send(`**Current settings:** Anyone with and above **${roleTag(doc.permission.value)}** *(\`${doc.permission.value}\`)* *(in Server Settings → Roles)* can use the bot.`);
		}
		return;
	} //! END +setting perm

	else if (args.length === 2 && (args[1] === "role" || args[1] === "inherit" || args[1] === "everyone")) {
		//* +setting perm [type]
		// Set an allow role to be exlusive or inherit

		if (roleTag(doc.permission.value) === undefined) {
			return msg.channel.send("The previous role must have been deleted. Everyone has access to use the bot.");
		}

		if(args[1] === "everyone") {
			//* Set permission to everyone.
			let everyone = msg.guild.roles.find(role => role.name === "@everyone");
			doc.permission.type = "inherit";
			doc.permission.value = everyone.id;
			save(msg, doc, "permission",
				"An error occurred trying allow everyone.",
				"Success! Everyone can now use the bot.",
				`serverSettings → Error trying to set role type ${args[1]} (@everyone) in server ${msg.guild.id}.`);
			return;
		}

		// Is it already that?
		if(doc.permission.type === args[1]) {
			msg.channel.send(`Permission type is already set to \`${args[1]}\`.`);
			return;
		} else {
			doc.permission.type = args[1];
			save(msg, doc, "permission",
				"An error occurred trying to change the role type.",
				`Successfully set the allow role to ${(args[1]==="role")?"be limited to the role **"+roleTag(doc.permission.value)+"** *(`"+doc.permission.value+"`)*":"inherit above the role **"+roleTag(doc.permission.value)+"** *(`"+doc.permission.value+"`)*"}.`,
				`serverSettings → Error trying to set role type ${args[1]} in server ${msg.guild.id}.`);
		}
	} //! END +setting perm [mode]

	else if (args.length === 3 && (args[1] === "role" || args[1] === "inherit")) {
		//* +setting role [type] [role]
		// Set an allow role and the type

		// Get role by pure ID
		if(/^(\d+)$/.test(args[2])) {
			if (Object.values(guildRoles).indexOf(args[2]) !== -1) {
				doneRole(args[2]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the ID \`${args[2]}\``);
				return;
			}
		}

		// Get role by tag
		else if (/^<@&(\d+)>$/.test(args[2])) {
			let id = args[2].slice(3,-1);
			if (Object.values(guildRoles).indexOf(id) !== -1) {
				doneRole(id);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the ID \`${id}\``);
				return;
			}
		}

		// Get role by name
		else {
			if (guildRoles.hasOwnProperty(args[2])) {
				doneRole(guildRoles[args[2]]);
			} else {
				msg.channel.send(`**Invalid argument:** Could not find a role by the name \`${args[2]}\``);
				return;
			}
		}

		function doneRole(value) {
			// Is it already that?
			if (doc.permission.type === args[1] && doc.permission.value === value) {
				msg.channel.send(`Permission type is already set to \`${args[1]}\` for **${roleTag(value)}** *(\`${value}\`)*.`);
				return;
			}

			doc.permission.type = (args[1]);
			doc.permission.value = value;
			save(msg, doc, "permission",
				"An error occurred trying to set the allow role.",
				`Successfully set the bot to ${(args[1]==="role")?"only allow members with the role **"+roleTag(value)+"** *(`"+value+"`)*":"allow anyone with **"+roleTag(value)+"** *(`"+value+"`)* and over to use the bot"}.`,
				`serverSettings → Error trying to set role type ${args[1]} and role ${value} in server ${msg.guild.id}.`
			);
			return;
		}
	} //! END +setting perm [type] [role]
	else {
		msg.channel.send("**Invalid argument:** Valid arguments are:\n`+setting permission`\n`+setting permission <\"role\"|\"inherit\">`\n`+setting permission <\"role\"|\"inherit\"> <role>`");
	}
	return;
}