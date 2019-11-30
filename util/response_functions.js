const chalk = require("chalk");
const config = require("../data/config.json");
const Discord = require("discord.js");
const {statisticsModel,serverSettings,userTags} = require("./database");
const Sentry = require("@sentry/node");
const mustache = require("mustache");

async function _notifyErr(/**@type {"Client"}*/Client, /**@type {Error}*/err) {
	const embed = new Discord.RichEmbed()
		.setColor("#cd1818")
		.setTimestamp(Date())
		.addField("Error:", err.toString());
	try {
		if(Client.user.id==="232224611847241729") Client.channels.get(config.notifyErrorsChannel).send(embed);
		else console.log(err.toString());
		if (process.env.DEBUG!=="true") {
			Sentry.captureException(err);
		}
	} catch(err) {
		Sentry.captureException(err);
		return;
	}
}

async function _notify(/**@type {"Client"}*/Client, /**@type {String}*/message, /**@type {"HEX"}*/colour="#46A024", /**@type {String}*/channel) {
	channel = (channel)?channel:config.notifyChannel;
	const embed = new Discord.RichEmbed()
		.setColor(colour)
		.setTimestamp(Date())
		.addField("Notification:", message);
	try {
		Client.channels.get(channel).send(embed);
	} catch (err) {
		console.error(err);
		return;
	}
}

async function _reconnect(/**@type {"Client"}*/Client) {
	//TODO: Change to setInterval ? 
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
			_notify(guild.client, `The bot was removed from a guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.\n**Guild name:** ${guild.name}\n**Guild ID:** \`${guild.id}\`\n**Guild owner:** ${guild.owner} (${guild.owner.tag} \`${guild.owner.id}\`)`, "#cd1818");
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
						_notify(guild.client, `The bot was re-added to a guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.\n**Guild name:** ${guild.name}\n**Guild ID:** \`${guild.id}\`\n**Guild owner:** ${guild.owner} (${guild.owner.user.tag} \`${guild.owner.id}\`)`);
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
					botRemoved: null
				});

				server.save((err,new_doc)=>{
					if(err) throw err;
					try {
						_notify(guild.client, `The bot was added to a guild with ${members} members and ${bots} bots!\nNow serving ${totalMembers} members and bots.\n**Guild name:** ${guild.name}\n**Guild ID:** \`${guild.id}\`\n**Guild owner:** ${guild.owner} (${guild.owner.user.tag} \`${guild.owner.id}\`)`);
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

		try {
			if(doc.hasOwnProperty("toObject")) {
				doc = doc.toObject();
			}
			doc.original_cmd = cmd;
		} catch (err) {
			let _err = new Error("Error converting guild object in Response_functions > _parse_message(), try block.\n"+err.toString());
			_notifyErr(msg.client, _err);
			return resolve({cmd:cmd,args:args,doc:doc});
		}

		return resolve({cmd:cmd,args:args,doc:doc});
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

async function _catch_new(/**@type {String}*/msg, /**@type {String}*/cmd, /**@type {Object}*/doc) {
	// Adds new commands/channels to the guild's settings
	let save = 0;
	// Add to guild's enabled/disabled only if guild
	if(msg.channel.type!=="dm") {
		if(!doc.enabledCommands.hasOwnProperty(cmd)) save = 2;
		if(!doc.enabledChannels.hasOwnProperty(msg.channel.id)) save += 4;
	
		if(save) {
			let d = await _get_doc(doc._id);
			if(d) {
				if(save&2) {d.enabledCommands[cmd] = true; d.markModified("enabledCommands");}
				if(save&4) {d.enabledChannels[msg.channel.id] = true; d.markModified("enabledChannels");}
				d.save(err => {
					if(err) throw err;
				});
			}
		}
	}
}

async function _check_self_perms(/**@type {"msg"}*/msg, /**@type {String}*/cmd, /**@type {String}*/prefix) {
	//TODO: Make this shit work.
	let to_check = [];
	to_check = [...msg.client.commands[cmd].daccess];
	to_check.push("SEND_MESSAGES");

	let missing = msg.channel.permissionsFor(msg.guild.me).missing(to_check);
	return new Promise(resolve => {
		// Checking for "view_channel" is done intitially already.
		// User does not need any of those permissions.	
		console.log("To check: ", to_check);
		console.log("Missing: ", missing);

		if(!missing.length) return resolve(true);
		if (missing.includes("SEND_MESSAGES")) {
			// Try DM if bot can't send "no perms" message
			console.log("Cannot send msg, trying DM");
			try {
				msg.author.send(`**Could not use command:** I do not have permission to send messages in that channel.\n*(<:Info:588844523052859392> If intentional, Admin should \`${prefix}settings channel disable ${msg.channel.id}\` in a message enabled channel instead)*`);
			}
			catch(_) {
				//
				console.log("Could not send DM");

			}
			return resolve(false);
		} else {
			console.log("Cannot send msg");
			msg.channel.send("**Could not use command:** Missing these guild permissions to use the command: `"+missing.join("`, `")+"`.");
			return resolve(false);
		}
	});
}

async function _render_variable_text(/**@type {"msg"}*/msg, /**@type {String}*/text) {
	return new Promise(resolve => {
		let guild_bots = msg.guild.members.filter(mem => mem.user.bot).size;

		let variables = {
			username: msg.author.username,
			avatar: msg.author.avatarURL.split("?").shift(),
			avatar_hash: msg.author.avatar,
			joined: msg.member.joinedAt,
			highest_role: msg.member.highestRole.name,
			color: msg.member.hexColor,
			tag: msg.author.tag,
			uid: msg.author.id,
			mention: `<@${msg.author.id}>`,
			guild: msg.guild.name,
			guild_id: msg.guild.id,
			bot_avatar: msg.client.user.avatarURL.split("?").shift(),
			bot_name: msg.client.user.username,
			bot_mention: `<@${msg.client.user.id}>`,
			date: new Date(),
			guild_total: msg.guild.memberCount,
			guild_members: msg.guild.memberCount - guild_bots,
			guild_bots: guild_bots,
			guild_created: msg.guild.createdAt,
			guild_txt_channel_count: msg.guild.channels.size,
			guild_roles_count: msg.guild.roles.size
		};

		try {
			return resolve(mustache.render(text, variables));
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error("ERROR parsing mustache text: ", err);
			return resolve(false);
		}
	});
}

function _blocked_for(/**@type {"msg"}*/msg, /**@type {String}*/reason) {
	msg.channel.send(reason).then(m => {
		setTimeout(()=>{
			try {
				m.delete();
			} catch(_){return;}
		}, 4000);
	});
}

async function _update_market_users(/**@type {Number}*/action, /**@type {"GuildMember"}*/member) {
	if(member.user.bot) return;
	// 0 = remove
	// 1 = add
	Sentry.configureScope(scope=>{
		scope.setUser({id:member.id, username:member.user.username});
		scope.setTags({guild:member.guild.id, guildName:member.guild.name, action:action?"Adding":"Removing"});
	});

	userTags.updateOne({_id: member.id}, {[action?"$push":"$pull"]:{guilds:member.guild.id}}, err=>{
		if (err) Sentry.captureException(err);
	});
}

async function _sync_market_users(/**@type {"Client"}*/Client) {
	userTags.find({}, ["_id","guilds"], (err,docs) => {
		if(err) throw err;
		if(!docs.length) return;
		let existing = Array(), now = Array(), updates = Array();

		for(let i=0;i<docs.length;i++) {
			existing = docs[i].guilds.sort().join("|");
			now = Client.guilds.filter(g => g.members.has(docs[i]._id)).keyArray(); // Find all guilds that has iteration member, and convert that to an array
			
			if(existing===now.sort().join("|")) continue; // No changes.

			updates.push(userTags.updateOne({_id:docs[i]._id}, {$set:{guilds:now}}));
		}

		Promise.all(updates)
			.then(()=>{
				console.log("All guilds synced.");
			}).catch(err=>{throw err;});
	});
}

async function _sync_market_users_for_guild(/**@type {"Guild"}*/guild) {
	let members = Array.from(guild.members.keys()).sort();
	// Find all members that does not have the new guild in array
	userTags.find({guilds:{$nin:guild.id}}, ["_id"]).sort("_id")
		.then(r => { 
			let toUpdate = Array();
			r = r.map(m=>m._id); // [{_id:x}] → [x]

			// Base comparison off of whichever array is shortest, for fastest computing
			if(members.length>r.length) toUpdate = r.filter(m=>members.includes(m));
			else toUpdate = members.filter(m => r.includes(m));
			
			// Push to array if it does not exist (atomic on top of filtered query)
			userTags.updateMany({_id:{$in:toUpdate}}, {$addToSet:{guilds:guild.id}}, (err,res) => {
				if(err) throw err;
				console.log(`Market users synced with guild ${guild.id} → ${res.n}`);
			});
		})
		.catch(err=>{
			throw err;
		});
}

async function _check_blocks(/**@type {"msg"}*/msg, /**@type {String}*/cmd) {
	return new Promise(resolve => {
		const {check_session,check_cooldown} = require("./session");
		// uid:cmd | time
		// Cooldown check:
		check_cooldown(msg.author.id, cmd)
			.then(r => {
				if(r) {
					msg.channel.send(`**Cooldown:** Wait another \`${((parseInt(r)-Date.now())/1000).toFixed(2)}\` seconds.`).then(m => m.delete(3000)); // Delete after 3 sec
					return resolve(true);
				}
				
				// User lock check:
				// locks, cmd:user | true
				return check_session(msg.author.id, cmd);
			})
			.then(r => {
				if(r) {
					msg.channel.send("**Denied:** You're already in a unique session with the `"+cmd+"` command. Finish it first.").then(m=>m.delete(3000));
					return true;
				} else if(msg.channel.type!=="dm") {

					// If not, check guildLock if in guild
					// locks:guild, cmd | user
					return check_session(msg.author.id, cmd, msg.guild.id);
				} else return false;
			})
			.then(r=>{
				if(r===true) return resolve(true);
				if(r) {
					msg.channel.send(`**Denied:** Only one session at once per guild. User with UID \`${r}\` is in session with this command.`).then(m=>m.delete(5000));
					return resolve(true);
				}
				return resolve(false); // All clear.
			})
			.catch(err=>{
				throw err;
			});
	});
}


// MASTER FUNCTION EXPORT.
module.exports = {
	notifyErr: async function(/**@type {"Client"}*/Client, /**@type {Error}*/err) {
		return _notifyErr(Client, err);
	},

	notify: async function(/**@type {"Client"}*/Client, /**@type {String}*/message, /**@type {String}*/color, /**@type {String}*/channel) {
		return _notify(Client, message, color, channel);
	},

	reconnect: async function(/**@type {"Client"}*/Client) {
		return _reconnect(Client);
	},

	new_member: async function(/**@type {"GuildMember"}*/member) {
		return _new_member(member);
	},

	remove_member: async function(/**@type {"GuildMember"}*/ member) {
		return _remove_member(member);
	},

	remove_role: async function(/**@type {"GuildRole"}*/ role) {
		return _remove_role(role);
	},

	remove_guild: async function(/**@type {"Guild"}*/guild) {
		return _remove_guild(guild);
	},

	add_guild: async function(/**@type {"Guild"}*/ guild, /**@type {"Client"}*/Client) {
		return _add_guild(guild, Client);
	},

	stats_up: async function(/**@type {String}*/guild_id, /**@type {String}*/cmd) {
		return _stats_up(guild_id, cmd);
	},

	check_ban: async function(/**@type {String}*/guild_id, /**@type {String}*/author_id) {
		return await _check_ban(guild_id, author_id);
	},

	parse_message: async function(/**@type {"msg"}*/msg) {
		return await _parse_message(msg);
	},

	sanitize_message: async function(/**@type {String}*/ message) {
		return await _sanitize_message(message);
	},

	get_prefix: async function(/**@type {"Guild"}*/guild) {
		return await _get_prefix(guild);
	},

	check_alias: async function(/**@type {"Client"}*/Client, /**@type {String}*/cmd) {
		return await _check_alias(Client, cmd);
	},

	perms_guild_ceck: async function( /**@type {Object}*/ doc, /**@type {"member"}*/ member) {
		return await _perms_guild_ceck(doc, member);
	},

	get_doc: async function(/**@type {"Guild"}*/guild) {
		return await _get_doc(guild);
	},

	disabled: async function(/**@type {String}*/channel_id, /**@type {String}*/cmd, /**@type {Array}*/args, /**@type {Object}*/doc) {
		return await _disabled(channel_id, cmd, args, doc);
	},

	catch_new: async function(/**@type {"msg"}*/msg, /**@type {String}*/cmd, /**@type {Object}*/doc) {
		return await _catch_new(msg, cmd, doc);
	},

	check_self_perms: async function(/**@type {"msg"}*/msg, /**@type {String}*/cmd, /**@type {String}*/prefix) {
		return await _check_self_perms(msg, cmd, prefix);
	},

	render_variable_text: async function(/**@type {"msg"}*/msg, /**@type {String}*/text) {
		return await _render_variable_text(msg, text);
	},

	blocked_for: function(/**@type {"msg"}*/msg, /**@type {String}*/reason) {
		return _blocked_for(msg, reason);
	},
	
	update_market_users: async function(/**@type {Number}*/action, /**@type {"GuildMember"}*/member) {
		return _update_market_users(action, member);
	},

	sync_market_users: async function(/**@type {"Client"}*/Client) {
		return _sync_market_users(Client);
	},

	sync_market_users_for_guild: async function(/**@type {"Guild"}*/guild) {
		return _sync_market_users_for_guild(guild);
	},

	check_blocks: async function(/**@type {"msg"}*/msg, /**@type {String}*/cmd) {
		return await _check_blocks(msg, cmd);
	}
};