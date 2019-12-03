const fe = require("../util/command-utilities");
const {serverSettings} = require("../util/database");
const Discord = require("discord.js");
const {set_session,del_session} = require("../util/session");
const ACCESS = require("../data/permissions.json");
const fn = require("../util/response_functions");
const Sentry = require("../util/extras");

module.exports = {
	cmd: "init",
	aliases: ["initialize","start","wizard"],
	cooldown: {min: 1},
	permissionLevel: ACCESS.admin,
	dm: false,
	desc: "Starts the bot setup wizard. Guides you though setting all the bot settings.",
	async exec(msg, cmd, args, doc) {
		set_session(msg.author.id, "init", msg.guild.id);
		let meta = {
			data: {
				prefix: undefined,
				list: true,
				perms: undefined,
				permsValue: undefined,
				mod: undefined,
				modValue: undefined,
				commands: undefined,
				channels: undefined
			}
		};

		let response = "<:Stop:588844523832999936> You can at any time say `abort` to stop and discard all.\
		\n<:Pause:588844523640061975> You can at any time say `stop` to stop and saved changes made so far.";
		// Start with this command
		msg.channel.send(response).catch(err=>{
			if(err.code && err.code===50013) {
				return msg.author.send("**Could not initiate:** Missing permission(s).").catch(()=>{return;});
			} else return;
		});
		return init(msg, doc, meta);
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
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``);
		msg.channel.send(embed);
	}
};

let warning,
	options = {
		maxMatches: 1,
		time: 1000*60*2,
		errors: ["time"]
	};

async function handleErr(msg, err, reply=false) {
	del_session(msg.author.id, "init", msg.guild.id);
	fn.notifyErr(msg.client, err);
	return msg.channel.send(reply ? reply : "**Error:** A generic error occurred. Incident logged.");
}

async function stop(msg, _doc, meta, type=false) {
	meta.step=-1;

	let chs = Object();
	msg.guild.channels.forEach(e => {
		if(meta.data.channels) {
			if(!meta.data.channels.includes(e.id)) chs = {...chs, [e.id]:true};
			else chs = {...chs, [e.id]:false};
		} else chs = {...chs, [e.id]:true};
	});

	let cmds = Object();
	for(let cmd in msg.client.commands) {
		if(meta.data.commands.includes(cmd)) cmds = {...cmds, [cmd]:false};
		else cmds = {...cmds, [cmd]:true};
	}

	// Save.
	let settings = {
		prefix: meta.data.prefix,
		whitelistMode: (meta.data.list==="whitelist"),
		completedSetup: true,
		permission: {
			type: meta.data.perms,
			value: meta.data.permsValue
		}, moderator: {
			type: meta.data.mod,
			value: meta.data.modValue
		},
		enabledCommands: cmds ? cmds : undefined,
		enabledChannels: chs ? chs : undefined
	};
	// Invert if whitelist
	if(meta.data.list==="whitelist") {
		for(let [key,val] of Object.entries(settings.enabledChannels)) {
			settings.enabledChannels[key] = !val;
		}
	}

	serverSettings.findOneAndUpdate({_id:msg.guild.id}, {$set:settings}, {omitUndefined:true,new:true}, (err,doc) => {
		if(err) return handleErr(msg, err, "**Error:** Something went wrong trying to save. Incident logged.");
		doc = doc.toObject();

		let config = "**Prefix:** `" + doc.prefix + "`\n";
		config += `**Channels mode:** ${doc.whitelistMode?"whitelist":"blacklist"}\n`;
		config += `**Premium enabled:** ${doc.premium?"<:Yes:588844524177195047>":"<:Stop:588844523832999936>"}`;

		let chs = `**${doc.whitelistMode?"Enabled":"Disabled"} channels:**`;
		if(doc.whitelistMode) {
			if(!Object.values(doc.enabledChannels).every(e=>e===true)) {
				for(let c in doc.enabledChannels) {
					if(!doc.enabledChannels[c]) chs += `\n<#${c}>`;
				}
			} else chs += " None. Use `"+_doc.prefix+"settings channel enable [channel]` to enable one current or given channel.";
		} else {
			if (Object.values(doc.enabledChannels).every(e=>e===false)) {
				for (let c in doc.enabledChannels) {
					if (doc.enabledChannels[c]) chs += `\n<#${c}>`;
				}
			} else chs += " None.";
		}

		let cmds = "**Disabled commands:**";
		if(!Object.values(doc.enabledCommands).every(e=>e===true)) {
			for(let c in doc.enabledCommands) {
				if(!doc.enabledCommands[c]) cmds += `${c}\n`;
			}
		} else cmds += " None.";

		let perm = "**Normal commands:**\n";
		if (!doc.permission.value || doc.permission.value === "NONE") perm += "None set; fallback to allowing everyone.\n";
		else if(doc.permission.value===msg.guild.id) perm += "Inherit — **Everyone** can use the bot.\n";
		else perm+= doc.permission.type==="inherit"?"Inherit — <@&"+doc.permission.value+"> *or higher* required.\n":"Role — <@&"+doc.permission.value+"> required.\n";

		perm+= "\n**Moderator commands:**\n";
		if(!doc.moderator.value || doc.moderator.value==="NONE") perm += "None set; only users with Administrator can use moderator commands.";
		else perm += doc.permission.type === "inherit" ? "Inherit — <@&" + doc.moderator.value + "> *or higher* required.\n" : "Role — <@&" + doc.moderator.value + "> required.\n";

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setTitle("Summary")
			.addField("General settings", config)
			.addField("Command permissions", perm)
			.addField("Commands", cmds)
			.addField("Channels", chs);
		if(type===1) msg.channel.send("**Stopped:** Time ran out. Changes saved.", embed);
		else if (type===2) msg.channel.send("**Stopped:** Changes were saved.", embed);
		else msg.channel.send("**Error:** An errror forced me to stop, but I saved the changes:", embed);

		del_session(msg.author.id, "init", msg.guild.id);
	});
}
async function abort(msg) {
	del_session(msg.author.id, "init", msg.guild.id);
	return msg.channel.send("<:Stop:588844523832999936> **Aborted:** All changes were discarded.").catch(()=>{return;});
}

async function alertTimeout(msg) {
	msg.channel.send("<:Info:588844523052859392> **Time!** 20 sec until I have to stop due to no response, <@"+msg.author.id+">");
	return;
}

async function send(msg, doc, meta, response, cb) {
	// fn, time, args
	warning = setTimeout(alertTimeout, options.time-20*1000, msg);

	fe.sendAndAwait(msg, response, options)
		.then(r => {
			clearTimeout(warning);

			Sentry.configureScope(scope => {
				scope.setExtras({"message":r, "step":meta.step, "meta":meta});
			});

			if(r.toLowerCase()==="abort") return abort(msg);
			else if (r.toLowerCase()==="stop") return stop(msg, doc, meta, 2);
			else return cb(msg, doc, meta, r);
		})
		.catch(err=>{
			del_session(msg.author.id, "init", msg.guild.id);

			//TODO: Doublecheck that the error code is correct.
			if(err.code && err.code === 50013) {
				// No permission to send messages.
				return abort(msg);
			} else if (err.size===0) {
				// Time ran out.
				return stop(msg, doc, meta, 1);
			} else {
				fn.notifyErr(msg.client, err);
				return stop(msg, doc, meta);
			}
		});
}

function number(num, max) {
	if(isNaN(num)) return false;
	else if(1>num||num>max) return false;
	else if(Number.isInteger(num)) return true;
}

// Async forEach definition
async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}
/*****************************************/

async function init(msg, doc, meta) {
	meta.step=1;
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Prefix", "Default and DM prefix is `"+process.env.PREFIX+"`.\n\n**Reply with a prefix to set.**");
	return send(msg, doc, meta, embed, catch_prefix);
}

async function catch_prefix(msg, doc, meta, r) {
	meta.step=1;
	// r is prefix
	meta.data.prefix=r;

	// Prefix set. Ask perms type.
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Permissions", "Who can use the normal bot commands?\n*e.g. ppi, colour, convert etc.*")
		.addField("Reply", "Reply with the corresponding number for:\n"+fe.num(1)+". Everyone\n"+fe.num(2)+". Users with a specific role and above\n"+fe.num(3)+". Only users with specific role");
	return send(msg, doc, meta, embed, catch_perm_type);
}

async function catch_perm_type(msg, doc, meta, r) {
	meta.step=2;
	// r is number
	if(!number(parseInt(r), 3)) return send(msg, doc, meta, "Try again with a whole number between 1 and 3.", catch_perm_type);

	const perm = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Permissions", "Who can use the normal bot commands?\n*e.g. ppi, colour, convert etc.*")
		.addField("Reply", "Reply with a role to apply this setting to.");

	const mod = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Moderator", "Who can use moderator level bot commands?\n*For upcomming feature(s).*")
		.addField("Reply", "Reply with the corresponding number for:\n"+fe.num(1)+". Users with a specific role and above\n"+fe.num(2)+". Only users with specific role");

	switch(r) {
	case "1":
		meta.data.perms="inherit";
		meta.data.permsValue=msg.guild.id;
		return send(msg, doc, meta, mod, catch_mod_type);
	case "2":
		meta.data.perms="inherit";
		return send(msg, doc, meta, perm, catch_perm_value);
	case "3":
		meta.data.perms="role";
		return send(msg, doc, meta, perm, catch_perm_value);
	}
}

async function catch_perm_value(msg, doc, meta, r) {
	meta.step=3;
	// r is role
	let role = await fe.findRole(r, msg.guild.roles);
	if(!role) return send(msg, doc, meta, "Could not find role. Try again.", catch_perm_value);
	meta.data.permsValue = role;
	
	// Permissions set. Ask for mod type:
	const mod = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Moderator", "Who can use moderator level bot commands?\n*For upcomming feature(s).*")
		.addField("Reply", "Reply with the corresponding number for:\n"+fe.num(1)+". Users with a specific role and above\n"+fe.num(2)+". Only users with specific role");

	return send(msg, doc, meta, mod, catch_mod_type);
}

async function catch_mod_type(msg, doc, meta, r) {
	meta.step=4;
	// r is number
	if(!number(parseInt(r), 2)) return send(msg, doc, meta, "Try again with a whole number between 1 and 2.", catch_mod_type);

	// Permission for mod set. Ask for mod value
	const mod = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Moderator", "Who can use moderator level bot commands?\n*For upcomming feature(s).*")
		.addField("Reply", "Reply with a role to apply this setting to.");

	switch(r) {
	case "1":
		meta.data.mod="inherit";
		return send(msg, doc, meta, mod, catch_mod_value);
	case "2":
		meta.data.mod="role";
		return send(msg, doc, meta, mod, catch_mod_value);
	}

	return send(msg, doc, meta, "TEXT", catch_mod_value);
}

async function catch_mod_value(msg, doc, meta, r) {
	meta.step=5;
	// r is role
	let role = await fe.findRole(r, msg.guild.roles);
	if(!role) return send(msg, doc, meta, "Could not find role. Try again.", catch_mod_value);
	if(role=== msg.guild.id) return send(msg, doc, meta, "**Denied:** Not allowed to grant moderator to everyone", catch_mod_value);
	meta.data.modValue = role;
	
	// Ask for disabled channels
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Disabled channels", "Do you want to apply blacklist or whitelist to channels?\nIf whitelist, new channels will be disabled by default.")
		.addField("Reply", "Reply with the corresponding number for:\n"+fe.num(1)+". **Whitelist:** Allow channels you'll list \n"+fe.num(2)+". **Blacklist:** Deny channels you'll list");

	return send(msg, doc, meta, embed, catch_channel_list_type);
}

async function catch_channel_list_type(msg, doc, meta, r) {
	meta.step=6;
	// r is number
	if (!number(parseInt(r), 2)) return send(msg, doc, meta, "Try again with a whole number between 1 and 2.", catch_channel_list_type);

	// Embed in case user decides to skip channel disabling. Ask for disabling commands.
	let embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Disabled commands", "Do you want to disable any commands right away?")
		.addField("Reply", "Reply with `list` to see commands,\n`next` to skip,\nor a spaced list of commands to disable.");

	switch(r) {
	case "1":
		meta.data.list="whitelist";
		break;
	case "2":
		meta.data.list="blacklist";
		break;
	case "3":
		meta.data.list="blacklist";
		return send(msg, doc, meta, embed, catch_command_disable);
	}

	// Channel list type set. Ask for channels
	embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
		.addField("Disabled channels", "Do you want to apply blacklist or whitelist to channels?\nIf whitelist, new channels will be disabled by default.");
	if (meta.data.list === "whitelist") embed.addField(":warning: Warning", "If you do not list any chanels, all will be disabled.\n`+settings channel enable` is bypasses and enable current channel.");
	embed.addField("Reply", "Reply with `next`to skip,\nor the channels to append to the list, separated by space.");

	return send(msg, doc, meta, embed, catch_channel_list);
}

async function catch_channel_list(msg, doc, meta, r) {
	meta.step=7;
	// r is list of channels, or 'next'.
	if(r.toLowerCase()==="next") {
		meta.step=8;
		// Top. Move on to disalbing commands.
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL)
			.addField("Disabled commands", "Do you want to disable any commands right away?")
			.addField("Reply", "Reply with `list` to see commands,\n`next` to skip,\nor a space separated list of commands.");
		return send(msg, doc, meta, embed, catch_command_disable);
	}

	r = r.split(/, +|,| +/); r = r.filter(Boolean); // Split & remove empty
	let a = Array();
	let len = r.length;
	for(let i=0;i<r.length;i++) {
		a.push(fe.findChannel(r[i], msg.guild.channels));
	}

	Promise.all(a)
		.then(r=>{
			r = r.filter(Boolean); // Some channels may be null. Remove them.
			if(!r.length) return send(msg, doc, meta, "**None found:** None of the channels you gave were valid.\nTry again or `next` to continue.", catch_channel_list);
			
			if(Array.isArray(meta.data.channels)) meta.data.channels = [...meta.data.channels, r]; 
			else meta.data.channels = r;
			
			let string = `${r.length} channel(s) added to ${meta.data.list}.\n`;
			if(r.length !== len) string += `Found ${r.length} of ${len}:\n<#${r.join(">\n<#")}>\n`;
			string += "Reply with more channels to append, or `next` to continue.";

			return send(msg, doc, meta, string, catch_channel_list);
		});
}

async function catch_command_disable(msg, doc, meta, r) {
	meta.step=9;
	// r is list of commands or 'list', or 'next'
	if(r.toLowerCase()==="next") return summary(msg, doc, meta);

	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter("Abort: 'abort' — Stop and save: 'stop'", msg.author.avatarURL);
		
	// 'list' to list commands.
	if(r.toLowerCase()==="list") {
		meta.step=10;
		let col1 = String(), col2 = String(), i=0;
		for(let cmd in msg.client.commands) {
			if(msg.client.commands[cmd].permissionLevel&ACCESS.user) {
				if(Math.ceil(Object.keys(msg.client.commands).length / 2 ) <= i) {
					col2 += `• ${cmd}\n`;
				} else {
					col1 += `• ${cmd}\n`;
				}
				i++;
			}
		}
		embed.addField("Commands", col1)
			.addField("\u200B", col2);
		return send(msg, doc, meta, embed, catch_command_disable);
	}

	r = r.split(/, +|,| +/); r = r.filter(Boolean); // Split & remove empty
	if(!r.length) return send("**Invalid argument(s):** Your input was not valid.");

	let _r = Array();
	// Async forEach usage
	await asyncForEach(r, async cmd => {
		_r.push(await fn.check_alias(msg.client, cmd));
	});
	r = _r;
	r = r.filter(Boolean);
	r = r.filter(cmd =>msg.client.commands[cmd].permissionLevel&ACCESS.user); // Remove non-user commands.
	if (!r.length) return send(msg, doc, meta, "**Invalid argument(s):** None of the commands you gave were valid.", catch_command_disable);

	if (meta.data.commands) meta.data.commands = [...meta.data.commands, r];
	else meta.data.commands = r;

	return send(msg, doc, meta, `Total of ${meta.data.commands.length} command(s) disabled.\nReply with more commands to disable, or \`next\` to finish.`, catch_command_disable);
}

async function summary(msg, _doc, meta) {
	meta.step=11;

	let chs = Object();
	msg.guild.channels.forEach(e => {
		if(meta.data.channels) {
			if(!meta.data.channels.includes(e.id)) chs = {...chs, [e.id]:true};
			else chs = {...chs, [e.id]:false};
		} else chs = {...chs, [e.id]:true};
	});

	let cmds = Object();
	for(let cmd in msg.client.commands) {
		if(meta.data.commands.includes(cmd)) cmds = {...cmds, [cmd]:false};
		else cmds = {...cmds, [cmd]:true};
	}

	let settings = {
		prefix: meta.data.prefix,
		whitelistMode: (meta.data.list === "whitelist"),
		completedSetup: true,
		permission: {
			type: meta.data.perms,
			value: meta.data.permsValue
		},
		moderator: {
			type: meta.data.mod,
			value: meta.data.modValue
		},
		enabledCommands: cmds ? cmds : undefined,
		enabledChannels: chs ? chs : undefined
	};

	// Invert if whitelist
	if(meta.data.list==="whitelist") {
		for(let [key,val] of Object.entries(settings.enabledChannels)) {
			settings.enabledChannels[key] = !val;
		}
	}

	serverSettings.findOneAndUpdate({_id:msg.guild.id}, {$set:settings}, {omitUndefined:true,new:true}, (err,doc) => {
		meta.step=12;
		if(err) return handleErr(msg, err, "**Error:** Something went wrong trying to save. Incident logged.");
		doc = doc.toObject();

		let config = "**Prefix:** `" + doc.prefix + "`\n";
		config += `**Channels mode:** ${doc.whitelistMode?"whitelist":"blacklist"}\n`;
		config += `**Premium enabled:** ${doc.premium?"<:Yes:588844524177195047>":"<:Stop:588844523832999936>"}`;

		let chs = `**${doc.whitelistMode?"Enabled":"Disabled"} channels:**`;
		if(doc.whitelistMode) {
			if(!Object.values(doc.enabledChannels).every(e=>e===true)) {
				for(let c in doc.enabledChannels) {
					if(doc.enabledChannels[c]) chs += `\n<#${c}>`;
				}
			} else chs += " None. Use `"+_doc.prefix+"settings channel enable [channel]` to enable one current or given channel.";
		} else {
			if (!Object.values(doc.enabledChannels).every(e=>e===true)) {
				for (let c in doc.enabledChannels) {
					if (!doc.enabledChannels[c]) chs += `\n<#${c}>`;
				}
			} else chs += " None.";
		}

		let cmds = "**Disabled commands:**";
		if(!Object.values(doc.enabledCommands).every(e=>e===true)) {
			for(let c in doc.enabledCommands) {
				if(!doc.enabledCommands[c]) cmds += `\n${c}`;
			}
		} else cmds += " None.";

		let perm = "**Normal commands:**\n";
		if (!doc.permission.value || doc.permission.value === "NONE") perm += "None set; fallback to allowing everyone.\n";
		else if(doc.permission.value===msg.guild.id) perm += "Inherit — **Everyone** can use the bot.\n";
		else perm+= doc.permission.type==="inherit"?"Inherit — <@&"+doc.permission.value+"> *or higher* required.\n":"Role — <@&"+doc.permission.value+"> required.\n";
		
		perm+= "\n**Moderator commands:**\n";
		if(!doc.moderator.value || doc.moderator.value==="NONE") perm += "None set; only users with Administrator can use moderator commands.";
		else perm += doc.moderator.type === "inherit" ? "Inherit — <@&" + doc.moderator.value + "> *or higher* required.\n" : "Role — <@&" + doc.moderator.value + "> required.\n";

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setTitle("Setup complete")
			.addField("General settings", config)
			.addField("Command permissions", perm)
			.addField("Commands", cmds)
			.addField("Channels", chs);
		msg.channel.send(embed);
		del_session(msg.author.id, "init", msg.guild.id);
	});
}