const chalk = require("chalk");
const config = require("../data/config.json");
const Discord = require("discord.js");
const {statisticsModel,serverSettings} = require("./database");
const Sentry = require("@sentry/node");

async function _notifyErr(/**@type {"Client"}*/Client, /**@type {Error}*/err) {
	const embed = new Discord.RichEmbed()
		.setColor("#cd1818")
		.setTimestamp(Date())
		.addField("Error:", err);
	try {
		Client.channels.get(config.notifyErrorsChannel).send(embed);
	} catch(err) {
		throw err;
	}
}

async function _notify(/**@type {"Client"}*/Client, /**@type {String}*/message, /**@type {"HEX"}*/colour="#46A024") {
	const embed = new Discord.RichEmbed()
		.setColor(colour)
		.setTimestamp(Date())
		.addField("Notification:", message);
	try {
		Client.channels.get(config.notifyChannel).send(embed);
	} catch (err) {
		console.error(err);
		return;
	}
}

async function _reconnect(/**@type {"Client"}*/Client) {
	Client.login(process.env.BOT_TOKEN_ID)
		.then(()=>{
			console.log(`[${Date()}] `+chalk.green("Reconnected successfully")+" as "+Client.user.tag);		
		})
		.catch(err=>{
			throw new Error(`[${Date()}] Bot disconnected and could not automatically re-connect!`, err);
		});
}

async function _new_member(/**@type {"GuildMember"}*/member) {
	let type = (member.user.bot) ? "bots" : "members";
	statisticsModel.updateOne(member.guild.id, {[type]:{$inc:1}});
}

async function _remove_member(/**@type {"GuildMember"}*/member) {
	let type = (member.user.bot) ? "bots" : "members";
	statisticsModel.updateOne(member.guild.id, {[type]:{$inc:-1}});
}

async function _remove_role(/**@type {"GuildRole"}*/role) {
	serverSettings.findById(role.guild.id, (err,doc) => {
		if(err) throw err;
		if((doc && doc.moderator.value===role.id) || (doc && doc.permission.value===role.id)) {
			if(doc.moderator.value===role.id) {
				doc.moderator.value = "NONE";
				doc.save(err=>{
					if(err) throw err;
					doc.save(err => {
						if (err) throw err;
						
						let embed = new Discord.RichEmbed()
							.setColor(process.env.THEME)
							.setTimestamp(Date())
							.addField("Changes:", `**Role type**: Moderator\n**Role name**: ${role.name}\n**Role ID**: ${role.id}`, true)
							.addField("Action taken in response:", "Moderator is now unset, so users must have Administrator permission.", true)
							.addField("What can you do?", `If you want to change the role to a new one, use this command in your guild:\n\`${doc.prefix}settings mod <"role" or "inherit"> <role ID/mention/name>\``);
						return role.guild.owner.send(`A role I was using in your guild **${role.guild.name}** was deleted:`, embed);
					});
				});
			} else {
				doc.permission.value = role.guild.id;
				doc.permission.type = "inherit";
				doc.save(err=>{
					if(err) throw err;
					
					let embed = new Discord.RichEmbed()
						.setColor(process.env.THEME)
						.setTimestamp(Date())
						.addField("Changes:", `**Role type**: Permission to use bot\n**Role name**: ${role.name}\n**Role ID**: ${role.id}`, true)
						.addField("Action taken in response:", "Permission change to let anyone use the bot.", true)
						.addField("What can you do?", `If you want to change the role to a new one, use this command in your guild:\n\`${doc.prefix}settings perm <"role" or "inherit"> <role ID/mention/name>\``);
					return role.guild.owner.send(`A role I was using in your guild **${role.guild.name}** was deleted:`, embed);
				});
			}
		}
	});
}

async function _remove_guild(/**@type {"Guild"}*/guild) {
	let bots = guild.members.filter(membr => membr.user.bot).size;
	let members = guild.memberCount - bots;
	let totalMembers = guild.client.guilds.map(guild => guild.memberCount).reduce((a, b) => a + b);
	statisticsModel.updateOne({_id:guild.id}, {$set:{botRemoved:Date()}}, (err,doc) => {
		if(err) throw err;
		if(!doc) return;

		try {
			_notify(guild.client, `The bot was removed from a guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.\n**Guild name:** ${guild.name}\n**Guild ID:** \`${guild.id}\`\n**Guild owner:** ${guild.owner} (\`${guild.owner.id}\`)`, "#cd1818");
		} catch(err) {
			throw err;
		}
	});
}

async function _add_guild(/**@type {"Guild"}*/guild, /**@type {"Client"}*/Client) {
	return new Promise(resolve=>{
		let bots = guild.members.filter(membr => membr.user.bot).size;
		let members = guild.memberCount - bots;
		let totalMembers = guild.client.guilds.map(guild => guild.memberCount).reduce((a, b) => a + b);

		statisticsModel.findById(guild.id, (err,doc) => {
			if(err) throw err;
			if(doc) {

				doc.botRemoved = null;
				if(doc.name !== guild.name) doc.name = guild.name;
				if(doc.bots !== bots) doc.bots = bots;
				if(doc.members !== members) doc.members = members;

				doc.save(err=>{
					if(err) throw err;
					// Send notification
					try {
						_notify(guild.client, `The bot was re-added to a guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.\n**Guild name:** ${guild.name}\n**Guild ID:** \`${guild.id}\`\n**Guild owner:** ${guild.owner} (\`${guild.owner.id}\`)`);
					} catch(err) {throw err;}
					return resolve(doc);
				});
			} else {
				let server = new statisticsModel({_id:guild.id}, {
					name: guild.name,
					cmdsUsed: 0,
					bots: bots,
					members: members,
					botAdded: Date(),
					botRemoved: null,
					commandStats: "x",
				});

				server.save((err,new_doc)=>{
					if(err) throw err;
					try {
						_notify(guild.client, `The bot was added to a new guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.`);
					} catch(err) {throw err;}
					return resolve(new_doc);
				});
			}
		});

		serverSettings.findById(guild.id, (err, doc) => {
			if (err) throw err;
			if (!doc) {
				// Channels in the guild
				let channels = Object();
				guild.channels.map(channel => {
					channels = {...channels,[channel.id]: true};
				});
				
				// Reset commands, since it'll refresh with new once re-built
				let commands = Object();
				for (let command in Client.commands) {
					commands = {...commands,[command]: true};
				}
				let adminRole = guild.roles.find(role => role.hasPermission("ADMINISTRATOR"));
				try {
					if(adminRole.id === null);
				} catch(e) {
					adminRole = {id:"NONE"};
				}

				let server = new serverSettings({
					_id:guild.id,
					prefix:process.env.PREFIX,
					completedSetup:false,
					premium:false,
					permission: {
						type:"inherit",
						value:guild.id
					}, moderator: {
						type:"role",
						value:adminRole.id
					},
					enabledCommands:commands,
					enabledChannels:channels
				});

				server.save(err => {
					if (err) {
						_notifyErr(guild.client, new Error("ERROR response_functions.add_guild.serverSettings.save: "));
						throw err;
					}
				});
			}
		});
	});
}

async function _stats_up(/**@type {String}*/guild_id, /**@type {String}*/cmd) {
	try {
		let shit = `commandStats.$.${cmd}`;
		let fucking = `commandStats.${cmd}`;
		statisticsModel.findOneAndUpdate({_id:guild_id, [fucking]:{$exists:true}}, {$inc:{[shit]:1, "cmdsUsed":1}});
	} catch(err) {
		console.error(err);
		throw err;
	}
}

async function _user_locked(/**@type {"msg"}*/msg, /**@type {String}*/cmd) {
	return new Promise(resolve => {
		if (msg.client.locks.cooldowns.has(msg.author.id+"_"+cmd)) {
			//TODO: Change to redis with expiry later
			let time = msg.client.locks.cooldowns.get(msg.author.id+"_"+cmd);
			msg.channel.send(`**Cooldown:** Wait another \`${time-Date.now()/1000}\` seconds.`)
				.then(m => {
					setTimeout(() => {
						try {
							m.delete();
						} catch (err) {}
					}, 3000);
				});
			return resolve(false);
		}
		else if(msg.client.locks.users.has(msg.author.id)) {
			msg.channel.send(config.messages.user_locked)
				.then(m=>{
					setTimeout(()=>{
						try {
							m.delete();
						} catch (err) {}
					},3000);
				});
			return resolve(false);
		}
		else if(msg.channel.type!=="dm"&&msg.client.locks.cmds.has(msg.guild.id+"_"+cmd)) {
			msg.channel.send(config.messages.cmd_locked);
			return resolve(false);
		} else {
			return resolve(true);
		}
	});
}

async function _user_lock(/**@type {"msg"}*/msg, /**@type {String}*/type, /**@type {String}*/value, /**@type {Number}*/cooldown) {
	switch(type) {
	case "cooldown":
		//TODO: Change to Redis with expiry later
		msg.client.locks.cooldowns.set(msg.author.id+"_"+value, Date.now()+(cooldown*1000));
		setTimeout(()=>{
			try {
				msg.client.locks.cooldowns.delete(msg.author.id+"_"+value);
			} catch (err) {}
		}, cooldown*1000);
		return;
	case "user":
		return msg.client.locks.user.add(msg.author.id);
	case "cmd":
		return msg.client.locks.cmd.add(msg.guild.id+"_"+value);
	default:
		return;
	}
}

async function _check_ban(/**@type {String}*/guild_id, /**@type {String}*/author_id) {
	const RedisDB = require("./redis.js").RedisDB;

	RedisDB.sismember("global_bans", author_id, (err, res) => {
		if(err) {
			console.log(err);
			Sentry.captureException(err);
			return false;
		}
		if(res) return true;
		RedisDB.SISMEMBER(`bans:${guild_id}`, author_id, (err,res) => {
			if (err) {
				Sentry.captureException(err);
				return false;
			}
			if(res) return true;
			return false;
		});
	});
}

async function _parse_message(/**@type {"msg"}*/msg) {
	return new Promise(async resolve => {
		let doc = (msg.channel.type==="dm")?{prefix:process.env.PREFIX}:await _get_doc(msg.guild);
		if(!doc) {
			_add_guild(msg.guild, msg.client);
			return resolve({args:null,cmd:null,doc:null});
		}
		let message = String();

		// Mention or prefix
		if(msg.content.startsWith(`<@${msg.client.user.id}>`)||msg.content.startsWith(`<@!${msg.client.user.id}>`)) {
			message = msg.content.slice((msg.content.startsWith(`<@${msg.client.user.id}>`)?`<@${msg.client.user.id}>`.length:`<@!${msg.client.user.id}>`.length));
		} else if (msg.content.startsWith(doc.prefix)) {
			message = msg.content.slice(doc.prefix.length);
		} else {
			return resolve({args:null,cmd:null,doc:null});
		}
		if (message.length===0) return resolve({args:null,cmd:null,doc:null});

		message = await _sanitize_message(message);
		let args = message.split(" ");
		let cmd = args.shift();

		return resolve({cmd:cmd,args:args,doc:doc.toObject()});
	});
}

async function _sanitize_message(/**@type {String}*/message) {
	return message.slice(0,500).replace(/ +/gi, " ").trim();
}

async function _get_prefix(/**@type {"Guild"}*/guild) {
	const RedisDB = require("./redis.js").RedisDB;

	function fallback() {
		serverSettings.findById(guild.id, (err,doc) => {
			if(err) {
				Sentry.captureException(err);
				return process.env.PREFIX;
			}
			if(!doc) return process.env.PREFIX;
			return doc.prefix;
		});
	}

	RedisDB.hget("prefixes", guild.id, (err,doc) => {
		if(err) {
			Sentry.captureException(err);
			return fallback();
		}
		if(!doc) return fallback();
		return doc;
	});
}

async function _get_doc(/**@type {"Guild"|String}*/guild) {
	return new Promise(resolve => {

		let id = (typeof(guild)==="string")?guild:guild.id;
		serverSettings.findById(id, async (err,doc) => {
			if(err) throw err;
			if(doc) return resolve(doc);
			return resolve(null);
		});
	});
}

async function _check_alias(/**@type {"Client"}*/Client, /**@type {String}*/cmd) {
	if(Client.commands.hasOwnProperty(cmd)) return cmd;
	for(let command in Client.commands) {
		if(Client.commands[command].aliases.includes(cmd)) {
			return Client.commands[command].cmd;
		}
	}
	return null;
}

async function _perms_guild_ceck(/**@type {Object}*/doc, /**@type {"member"}*/member) {
	// 
	return;
}

async function _disabled(/**@type {String}*/channel_id, /**@type {String}*/cmd, /**@type {Array}*/args, /**@type {Object}*/doc) {
	return new Promise(resolve => {
		if(config.bypassedCommands.includes(cmd+" "+args.join(" ").toLowerCase())) return resolve(false);

		if(doc.enabledCommands.hasOwnProperty(cmd) && !doc.enabledCommands[cmd]) return resolve(true);
		else if (doc.enabledChannels.hasOwnProperty(channel_id) && !doc.enabledChannels[channel_id]) return resolve(true);
		else return resolve(false);
	});
}

async function _catch_new(/**@type {String}*/channel_id, /**@type {String}*/cmd, /**@type {Object}*/doc) {
	// Adds new commands/channels to the guild's settings
	let save = 0;
	if(!doc.enabledCommands.hasOwnProperty(cmd)) save = 2;
	if(!doc.enabledChannels.hasOwnProperty(channel_id)) save += 4;
	if(save) {
		let d = await _get_doc(doc._id);
		if(d) {
			if(save&2) {d.enabledCommands[cmd] = true; d.markModified("enabledCommands");}
			if(save&4) {d.enabledChannels[channel_id] = true; d.markModified("enabledChannels");}
			d.save(err => {
				if(err) throw err;
			});
		}
	}
}

// MASTER FUNCTION EXPORT.
module.exports = {
	notifyErr: async function(/**@type {"Client"}*/Client, /**@type {Error}*/err) {
		return _notifyErr(Client, err);
	},

	notify: async function(/**@type {"Client"}*/Client, /**@type {String}*/message, /**@type {String}*/color) {
		return _notify(Client, message, color);
	},

	reconnect: async function (/**@type {"Client"}*/Client) {
		return _reconnect(Client);
	},

	new_member: async function (/**@type {"GuildMember"}*/member) {
		return _new_member(member);
	},

	remove_member: async function (/**@type {"GuildMember"}*/ member) {
		return _remove_member(member);
	},

	remove_role: async function (/**@type {"GuildRole"}*/ role) {
		return _remove_role(role);
	},

	remove_guild: async function (/**@type {"Guild"}*/guild) {
		return _remove_guild(guild);
	},

	add_guild: async function (/**@type {"Guild"}*/ guild, /**@type {"Client"}*/Client) {
		return _add_guild(guild, Client);
	},

	stats_up: async function (/**@type {String}*/guild_id, /**@type {String}*/cmd) {
		return _stats_up(guild_id, cmd);
	},

	user_locked: async function (/**@type {"msg"}*/msg, /**@type {String}*/cmd) {
		return await _user_locked(msg, cmd);
	},

	user_lock: async function (/**@type {"msg"}*/msg, /**@type {String}*/type, /**@type {String}*/value, /**@type {Number}*/cooldown=5) {
		return await _user_lock(msg, type, value, cooldown);
	},

	check_ban: async function (/**@type {String}*/guild_id, /**@type {String}*/author_id) {
		return await _check_ban(guild_id, author_id);
	},

	parse_message: async function (/**@type {"msg"}*/msg) {
		return await _parse_message(msg);
	},

	sanitize_message: async function (/**@type {String}*/ message) {
		return await _sanitize_message(message);
	},

	get_prefix: async function (/**@type {"Guild"}*/guild) {
		return await _get_prefix(guild);
	},

	check_alias: async function (/**@type {"Client"}*/Client, /**@type {String}*/cmd) {
		return await _check_alias(Client, cmd);
	},

	perms_guild_ceck: async function ( /**@type {Object}*/ doc, /**@type {"member"}*/ member) {
		return await _perms_guild_ceck(doc, member);
	},

	get_doc: async function(/**@type {"Guild"}*/guild) {
		return await _get_doc(guild);
	},

	disabled: async function(/**@type {String}*/channel_id, /**@type {String}*/cmd, /**@type {Array}*/args, /**@type {Object}*/doc) {
		return await _disabled(channel_id, cmd, args, doc);
	},

	catch_new: async function(/**@type {String}*/channel_id, /**@type {String}*/cmd, /**@type {Object}*/doc) {
		return await _catch_new(channel_id, cmd, doc);
	}
};