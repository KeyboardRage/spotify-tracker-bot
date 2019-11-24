const Discord = require("discord.js");
const {marketUserModel,userTags} = require("../../util/database");
const {portfolios,creator_types} = require("./config.json");
const fn = require("../../util/response_functions");
const fe = require("../../util/command-utilities");
const {allValidTags} = require("./info");

module.exports = {
	social_list: function () {
		return _social_list();
	},
	find: async function (msg, args, doc, search) {
		return await _find(msg, args, doc, search);
	},
	cmds: async function(msg, args, doc) {
		return await _cmds(msg, args, doc);
	},
	handleErr: async function(err, msg, custom) {
		return await _handleErr(err, msg, custom);
	},
	show_types: async function(msg, args, doc) {
		return await _show_types(msg, args, doc);
	},
	tags: async function(msg, args, doc) {
		return await _tags(msg, args, doc);
	},
	creative_type: async function(input) {
		return await _creative_type(input);
	},
	creative_fields: function(msg, doc) {
		return _creative_fields(msg, doc);
	},
	list: async function(msg) {
		return _list(msg);
	}
};

async function _handleErr(err, msg, custom=false) {
	msg.channel.send(custom?custom:"**Could not complete command:** An error ocurred. The error has been reported.");
	fn.notifyErr(msg.client, err);
	return;
}

async function _create_embed(msg, user, self=false) {
	return new Promise(async (resolve,reject) => {
		try {
			// Get target user's active avatar
			let target_user = await msg.client.fetchUser(user._id)
				.catch(err=>{
					if(err.code===10013) {
						console.log("Could not find user.");
						target_user_avatar = "";
					} else {
						fn.notifyErr(msg.client, err);
						console.error(err);
						return reject(err);
					}
				});

			let title = String();
			if (user.meta.main_type === 6) {
				title = (user.meta.company_url) ? `Works at [${user.meta.company}](${user.meta.company_url})` : "Works at " + user.meta.company;
			} else if (user.meta.main_type === 5) title = "Private person";
			else title = creator_types[user.meta.main_type.toString()].name;
	
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setThumbnail(`https://cdn.discordapp.com/avatars/${target_user.id}/${target_user.avatar}.png?size=1024`)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription((self)?"Your own profile":"Profile of <@"+user._id+">")
				.addField((self)?"About you":"About "+user.name, `**Name:** ${user.name}\n**Discord:** ${target_user.username}#${target_user.discriminator}\n**Discord ID:** ${user._id}`, true)
				.addField("\u200B", `**Title:** ${title}`, true);
			if (user.meta.main_type <= 4) {
				let socials = String();
				embed.addField("Status", `**Availability:** ${(user.meta.available)?"open for comissions.":"not open for comissions."}\n${(user.meta.tags && user.meta.tags.length)?"**User works with:**\n"+user.meta.tags.join(", "):""}`);
				if(user.portfolios) {
					for (let elm in user.portfolios) {
						if (elm == "1") socials += `[Personal site →](${user.portfolios[elm]}) \n`;
						else if (elm == "8") socials += `[Facebook page →](${user.portfolios[elm]})\n`;
						else if (portfolios[elm].need_url_prefix) socials += `**${portfolios[elm].name}**: [${portfolios[elm].prefix}${user.portfolios[elm]}](${portfolios[elm].url_prefix}${user.portfolios[elm]})\n`;
						else socials += `**${portfolios[elm].name}**: ${portfolios[elm].prefix}${user.portfolios[elm]}\n`;
					}
					embed.addField("Portfolio and social media", socials);
				}
			}
			return resolve(embed);
		} catch(err) {
			return reject(err);
		}
	});
}

async function _find(msg, args, doc, search=false) {
	if(search) args.shift();
	if (!args.length) {
		marketUserModel.findById(msg.author.id, async (err, user) => {
			if (err) return _handleErr(err, msg);
			if (!user) return msg.channel.send("You don't have a profile. Register with `" + doc.prefix + "register`.");
			if (user) {
				let embed = await create_embed(msg, user.toObject(), true).catch(err=>{return _handleErr(err, msg);});
				return msg.channel.send(embed).catch(err=>{
					if(err.code && err.code === 50035) {
						return msg.channel.send("**Could not send:** If your profile has an image, its link is most likely malformated, so Discord refuse to send embed.\nChange image with `"+doc.prefix+"profile set cover <image link>`. That or some of your content contains invalid characters.");
					} else {
						return _handleErr(err, msg);
					}
				});
			}
		});
	} else {
		let not_guild_member = false,
			user,
			dm = (msg.channel.type === "dm");
		// Only possible if in guild
		if(!dm) {
			user = msg.guild.members.find(u => u.user.id == args[0]);
			if (!user) user = msg.mentions.members.first() || msg.guild.members.find(u => u.user.tag.toLowerCase() == args.join(" ").toLowerCase()) || msg.guild.members.find(u => u.user.username.toLowerCase() == args.join(" ").toLowerCase()) || msg.guild.members.find(u => u.displayName.toLowerCase() == args.join(" ").toLowerCase());
			user = (user) ? user.id : null;
		}

		if (!user) {
			if (args[0].match(/[0-9]+/)) {
				not_guild_member = true;
				user = args[0].match(/[0-9]+/)[0];
			} else if (dm) {
				return msg.channel.send("**Invalid argument:** While in DM, you may only search by user ID's. To search user names, tags, and mentions, you must be in the guild you wish to search.");
			}
		}

		marketUserModel.findById(user, async (err, _user) => {
			if (err) return _handleErr(err, msg);
			if (!_user && user===msg.author.id) return msg.channel.send("You can use `"+doc.prefix+"profile` to view your own profile — but you don't have one, so register first with `"+doc.prefix+"register`.");
			if (!_user) return msg.channel.send(`Could not find user ${(not_guild_member)?"in this guild nor globally.":"in this guild. You could try the Discord ID to search globally."}`);
			let embed = await create_embed(msg, _user.toObject());
			return msg.channel.send(embed);
		});
	}
}


async function _cmds(msg, args, doc) {
	// Something
	let string = `•    \`${doc.prefix}profile\` get your own profile, if you've registered.\
	\n•    \`${doc.prefix}profile cmds\` lists available commands *(this very message)*.\
	\n•    \`${doc.prefix}profile edit\` see all possible edit profile sub-commands.\
	\n•    \`${doc.prefix}profile tags\` list all possible sub-categories *(tags)* of work for a creative field.\
	\n•    \`${doc.prefix}profile fields\` list all possible creative field.\
	\n•    \`${doc.prefix}profile socials\` list all possible social items / portfolios you can put on your profile.\
	\n•    \`${doc.prefix}profile does <type of work>\` finds users in current guild that does all of/one of *(\`--or\`)* the tags specified.\
	\n•    \`${doc.prefix}profile <id|mention|username|tag>\` search for user in this guild by ID, mention, username, or tag. Use ID for global search outside guild.\
	\n•    \`${doc.prefix}profile search <id|mention|username|tag>\` same as above, except for cases where name would be same as a sub-command.\
	\n•    \`${doc.prefix}profile register\` alias of the command \`${doc.prefix}register\`.`;
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.addField("Available sub-commands", string);
	return msg.channel.send(embed);
}

async function _tags(msg, args, doc) {
	let time = Date.now();
	args.shift(); // remove 'does'
	// Page handling
	let skips = 0;
	let limit = 10;
	let page = 0;
	if (fe.regexIndexOf(args, /\d+/) !== -1) {
		skips = parseInt(args.splice(fe.regexIndexOf(args, /\d+/), 1));
		skips--;
		if(skips<0) skips = 0;
		page = skips;
		skips = limit*skips;
	}
	// console.log(page, skips, limit);
	// --or flag handling
	let or = false;
	if(args.includes("--or")) {
		or = true;
		args.splice(args.indexOf("--or"), 1);
	}
	// Rest is tags
	if(args.length > 3) return msg.channel.send("**Too many argument:** Maximum amount of tags for search is three.");
	let tags = await allValidTags();
	args = args.filter(t => {t = t.toLowerCase();return (tags.includes(t));});
	if(!args.length) return msg.channel.send("**Invalid argument(s):**  None of the tags you gave were not valid. See `"+doc.prefix+"profile tags` for a list of valid tags.");
	
	let total = Number();
	userTags.find({"guilds":{$in:msg.guild.id}, "tags":{[or?"$in":"$all"]:args}, "available":true}, ["_id"])
		.then(docs => {
			if(!docs.length) return msg.channel.send("**No results:** Could not find any users in this guild that had one of these tags: `" + args.join("`, `") + "`.");
			total = docs.length;
			return marketUserModel.find({"_id":{$in:docs.map(u=>u._id)}}, ["_id","meta.discord","meta.discriminator"], {limit:limit, skip:skips});
		})
		.then(docs => {
			if(!docs.length) return msg.channel.send("**No results:** Could not fetch the users. Fetching returned 0 retults.");
			let col1 = String(),
				col2 = String();

			for(let i=0;i<docs.length;i++) {
				if(i>=Math.floor(docs.length/2)) {
					col2 += `<@${docs[i]._id}>\n`;
				} else {
					col1 += `<@${docs[i]._id}>\n`;
				}
			}

			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setDescription("Tag search results");

			// Logic for AND | OR mode, and showing total amount of users.
			if(!or) embed.addField("Results", `**${total} users** found that has all of these tags: **${args.join("**, and **")}**.\
			\n**Showing ${total>docs.length?docs.length+"** of **"+total+"** members.":"all** possible members."}\
			\n\nUse \`${doc.prefix}profile does ${args.join(" ")} <number>\` to browse other pages.\
			\nAdd flag \`--or\` to change search to 'or' more instead of 'and' for multiple tags.`);
			else embed.addField("Results", `**${total} users** found that has one of these tags: **${args.join("**, or **")}**.\
			\n**Showing ${total>docs.length?docs.length+"** of **"+total+"** members.":"all** possible members."}\
			\n\nUse \`${doc.prefix}profile does ${args.join(" ")} <number>\` to browse other pages.\
			\nAdd flag \`--or\` to change search to 'or' more instead of 'and' for multiple tags.`);

			// Inform about profile inspection, and display bug, and rest of embed.
			embed.addField("Inspect profile", `Check out a specific user's profile with \`${doc.prefix}profile <id|mention|username>\`\n\
				\n<:Info:588844523052859392> ***NOTE:*** *Your Discord client may not have all the users cached, so they're displayed as <@UID> even though they're in this guild.*`);
			if(col1.length) embed.addField("Users", col1, true);
			if(col2.length) embed.addField("\u200B", col2, true); // if Math.floor(1/2) = 0, and i>=0 is true, then user is added to coloumn two.

			// Logic for footer
			embed.setFooter(`${msg.author.tag} — Page ${page+1}/${(total-total%limit)/limit+(total%limit?1:0)}`, msg.author.avatarURL);

			// Early warning system for too complicated query
			let taken = Date.now()-time;
			if(taken>100) {
				fn.notifyErr(msg.client, new Error("Took "+taken+"ms for "+msg.author.id+" user profile search on tags: "+args.join(", ")));
			}

			return msg.channel.send(embed);
		})
		.catch(err => {
			let taken = Date.now() - time;
			if (taken > 100) {
				fn.notifyErr(msg.client, new Error("Took " + taken + "ms for " + msg.author.id + " user profile search on tags: " + args.join(", ")));
			}
			return _handleErr(err, msg, "**Error:** An error occurred searching for users. Incident logged.");
		});
}

async function send(msg, doc, response, callback, dm=false) {
	if(dm && msg.channel.type!=="dm") {
		fe.dmAndAwait(msg, response, {time:20000,errors:["time"],maxMatches:1})
			.then(r => {
				return callback(msg, r, doc);
			})
			.catch(err => {
				if(err.size===0) {
					msg.reply("**Time ran out:** Aborted.");
				} else {
					return _handleErr(err, msg);
				}
			});
	} else {
		fe.sendAndAwait(msg, response, {time:20000,errors:["time"],maxMatches:1})
			.then(r => {
				return callback(msg, r, doc);
			})
			.catch(err => {
				if(err.size===0) {
					msg.reply("**Time ran out:** Aborted.");
				} else {
					return _handleErr(err, msg);
				}
			});
	}
}

/**
 * Outputs a numbered list of portfolio items possible.
 * @returns {String} A numbered list of portfolio items possible.
 */
function _social_list() {
	let i=0;
	let string = String();
	for (let port in portfolios) {
		i++;
		string += `\n${num(i)} ${portfolios[port].name}`;
	}
	return string;
}

/**
 * Returns emote number string
 * @param {Number} input Number 1 to 9
 * @returns {String} The emote string for that number
 */
function num(input) {
	switch(input) {
	case 1:
		return "<:One:588844523329683476>";
	case 2:
		return "<:Two:588844524659540030>";
	case 3:
		return "<:Three:588844524659539972>";
	case 4:
		return "<:Four:588844515520020598>";
	case 5:
		return "<:Five:588844516283252736>";
	case 6:
		return "<:Six:588844524332384276>";
	case 7:
		return "<:Seven:588844523938119680>";
	case 8:
		return "<:Eight:588844512286343179>";
	case 9:
		return "<:Nine:588844524433047552>";
	}
}


/**
 * Checks if input is valid creative field type
 * @param {String|Number} input Any single input.
 * @returns {Number} The creative field number, 0 if no match
 */
function _creative_type(input) {
	if(!input) return 0;
	switch (input.toLowerCase()) {
	case "one":
	case "1":
	case 1:
	case "design":
	case "designer":
		return 1;
	case "two":
	case "2":
	case 2:
	case "artist":
	case "artists":
	case "art":
		return 2;
	case "three":
	case "3":
	case 3:
	case "vfx":
	case "video":
	case "motion":
	case "editor":
	case "vfx/video/motion":
	case "vfx/video/motion editor":
		return 3;
	case "four":
	case "4":
	case 4:
	case "other":
	case "other creator":
	case "other creative":
	case "creator":
		return 4;
	default:
		return 0;
	}
}

async function _show_types(msg, args, doc) {
	if(args.length===0) {
		let response = "Give me a creative field you want to see tags for.\n*Reply with the corresponding number:*\n**Creator**\n<:One:588844523329683476> Designer\n<:Two:588844524659540030> Artist\n<:Three:588844524659539972> VFX/Video/Motion Editor\n<:Four:588844515520020598> Other creator";
		return send(msg, doc, response, _show_types);
	} else {
		let type = _creative_type(args[0]);
		
		if(!type) return send(msg, doc, "**Invalid response:** You must use one of the numbers or name of the creative field.", _show_types);
		else {
			let embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription("All tags for "+creator_types[type.toString()].name);
			embed = gen_tags_embed(embed, type);
			embed.addField("Using the tags", "You can search for a user in this guild that does all of/one of the tags. You can search **up to three tags** at a time, and it will return users that does all of them, or one of them with `--or` flag set.\n**Command:** `"+doc.prefix+"profile does <tag(s)> ['--or']`.");
	
			return msg.channel.send(embed);
		}
	}
}

function gen_tags_embed(embed, type) {
	let col1 = String();
	let col2 = String();
	let half = Math.ceil(creator_types[type.toString()].tags.length/2);
	let sorted_tags = creator_types[type.toString()].tags.sort();
	sorted_tags.forEach((tag, i) => {
		if (i < half) {
			if(i===0) col1 +=tag;
			else col1 += "\n" + tag;
		} else {
			col2 += "\n" + tag;
		}
	});
	embed.addField("Tags", col1, true)
		.addField("\u200B", col2, true);
	return embed;
}


async function create_embed(msg, doc) {
	return new Promise(async (resolve,reject) => {
		try  {
			let user = await fe.getUser(msg.client, doc._id).catch(err=>{return reject(err);});

			// If no user found, create from DB data.
			if(!user) user = {
				avatarURL: "",
				id: doc._id,
				username:doc.meta.discord,
				discriminator:doc.meta.discriminator,
				tag: doc.meta.discord+"#"+doc.meta.discriminator
			};

			// About field.
			let string = `**Name:** ${doc.name}\n${user.username}#${user.discriminator}\n<@${user.id}> — \`${user.id}\``;
			if (doc.meta.email) string += `\n**E-mail:** ${doc.meta.email}`;

			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor((doc.meta.color)?doc.meta.color:process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription(`Profile of ${doc.name}`)
				.addField("**About:**", string);

			// Set thumbnail if possible
			if(user.avatarURL.length) {
				embed.setThumbnail(user.avatarURL);
			}

			// Custom description field
			if(doc.meta.desc) {
				embed.addField("**Description:**", doc.meta.desc);
			}

			// Company info
			if(doc.meta.company) {
				string = (doc.meta.company_url)?`[${doc.meta.company}](${doc.meta.company_url})`:doc.meta.company;
				embed.addField("**Company information:**", `Works at ${string}`);
			} else if (doc.meta.company_url) {
				embed.addField("**Company information:**", `Works at ${doc.meta.company_url}`);
			}

			// Creative type / title
			if(doc.meta.main_type<=4) {
				let type = creator_types[doc.meta.main_type].name;
				string = `**${type}**${(doc.meta.available)?"<:Green:642514515514228736>Open for commissions.":"<:Red:642514386497568789>Not available for hire."}`;
				if(doc.meta.min_budget) string += `\n**Minimum budgets:** $${doc.meta.min_budget}`;
				let res = await userTags.findById(user.id, ["tags"]).catch(err=>{return reject(err);});
				if(res && res.tags) string += `\n**Working field(s):** ${res.tags.join(", ")}`;
				embed.addField(`**Hire ${doc.name}:**`, string);
			} else if(doc.meta.main_type===6) {
				// Business representative
				embed.addField("**Type:**", "**Buyer** — Company representative.");
			} else {
				// Private person
				embed.addField("**Type:**", "**Buyer** — Private person.");
			}

			// Social media and portfolios
			if(doc.portfolios && Object.keys(doc.portfolios).length) {
				string = String();
				for (let elm in doc.portfolios) {
					if (elm == "1") string += `[Personal website →](${doc.portfolios[elm]}) \n`;
					else if (elm == "8") string += `[Facebook page →](${doc.portfolios[elm]})\n`;
					else if (portfolios[elm].need_url_prefix) string += `${portfolios[elm].name}: [${portfolios[elm].prefix}${doc.portfolios[elm]}](${portfolios[elm].url_prefix}${doc.portfolios[elm]})\n`;
					else string += `${portfolios[elm].name}: ${portfolios[elm].prefix}${doc.portfolios[elm]}\n`;
				}
				embed.addField("**Social media & portfolios:**", string);
			}

			// Cover image
			if(doc.meta.cover_img) {
				embed.setImage(doc.meta.cover_img);
			}

			return resolve(embed);
		} catch(err) {
			console.error(err);
			return reject(new Error(err.toString() + ". USER: " + JSON.stringify(msg.user) + "\nDOC:" + JSON.stringify(doc)));
		}
	});
}


/**
 * Returns a list of numbers/names of social items
 * @returns {String} Neatly formatted string of social item numbers and names
 */
async function _creative_fields(msg, doc) {
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.setDescription("Possible creative fields")
		.addField("**Usage:**", `Set your creative field with \`${doc.prefix}profile set field <number|alias> [tags]\`. If you do not specify valid tags, it will be unset. You can add back tags with \`${doc.prefix}profile set tags [tags]\`, or see a list of available ones with \`${doc.prefix}profile tags\`.`);

	let string = String();
	let i = 0;
	for (let type in creator_types) {
		i++;
		string += `\n${num(i)} ${creator_types[type].name} \`${creator_types[type].synonyms.join("`, `")}\``;
	}
	embed.addField("**Fields:**", string);
	return embed;
}

async function _list(msg) {
	userTags.find({guilds:{$in:[msg.guild.id]}}, (err,docs) => {
		if(err) return _handleErr(err, msg);
		if(!docs.length) return msg.channel.send("**No results:** Could not find any users in this guild that has a profile.");
		let page_max = 50,
			col1 = String(),
			col2 = String(),
			more = null;
		if(docs.length>50) more = `… and ${docs.length-50} other members.`;

		for(let i=0;i<docs.length;i++) {
			if(i>=Math.ceil(docs.length/2)) {
				col2 += `<@${docs[i]._id}>\n`;
			} else {
				col1 += `<@${docs[i]._id}>\n`;
			}
			if(i>page_max-1) break;
		}
		if(more) col2 += more;

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setDescription("People with a profile in this guild")
			.addField(`**Users: ** (${docs.length}${docs.length>page_max?" - "+page_max+" shown":""})`, col1, true)
			.addField("\u200B", col2, true);
		return msg.channel.send(embed);
	});
}