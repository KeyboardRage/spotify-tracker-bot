const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");
const {marketUserModel,userTags} = require("../util/database");
const types = require("../data/config.json").market.creator_types;
const portfolios = require("../data/config.json").market.portfolios;
const fn = require("../util/response_functions");
const fe = require("../util/command-utilities");
const Sentry = require("../util/extras");

module.exports = {
	cmd: "profile",
	aliases: ["user","users","profiles"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc: "Interact with profiles on Grafik",
	async exec(msg, cmd, args, doc) {
		if(!args.length) return find(msg, args, doc);
		switch(args[0]) {
		case "cmds":
		case "commands":
		case "cmd":
			return cmds(msg, args, doc);
		case "socail":
		case "socials":
		case "portfolio":
			return msg.channel.send("**Socials / portfolios:**\n"+await social_list());
		case "edit":
			if(doc.level.userLevel & ACCESS.owner) { //TODO: Remove this
				args.shift();
				marketUserModel.findById(msg.author.id, ["_id"], (err,user) => {
					if(err) return handleErr(err, msg);
					if(!user) return msg.channel.send("You don't have a profile. Register with `" + doc.prefix + "register`.");
					return edit(msg, args, doc);
				});
			} else return msg.channel.send("Sub-command disabled while it's being worked on.");
			break;
		case "unset":
			if (doc.level.userLevel & ACCESS.owner) {
				if (args[0].toLowerCase() === "unset" || args[0].toLowerCase() === "remove" || args[0].toLowerCase() === "delete"||args[0].toLowerCase() === "-") {
					args.shift();
					return edit_unset(msg, args, doc);
				} else return msg.channel.send("asd");
			} else return msg.channel.send("Sub-command disabled while it's being worked on.");
		case "set":
			if (doc.level.userLevel & ACCESS.owner) {
				if (args[0].toLowerCase() === "set" || args[0].toLowerCase() === "add" || args[0].toLowerCase() === "+") {
					args.shift();
					return edit_set(msg, args, doc);
				} else return msg.channel.send("asd");
			} else return msg.channel.send("Sub-command disabled while it's being worked on.");
		case "tags":
		case "types":
			args.shift();
			return show_types(msg, args, doc);
		case "search":
		case "find":
			return find(msg, args, doc, true);
		case "does":
			if(msg.channel.type==="dm") return msg.channel.send("**Cannot use command:** This sub-command is only available in guilds, as it searches for users in the guild that does one of the types of work.");
			return tags(msg, args, doc);
		case "register":
			return msg.client.commands.register.exec(msg, cmd, args, doc);
		default:
			return find(msg, args, doc);
		}
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("user", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <id|mention|username|tag|[option]>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} cmds\`\n\`${doc.prefix}${this.cmd} VirtusGraphics\`\n\`${doc.prefix}${this.cmd} edit\`\n\`${doc.prefix}${this.cmd} search 164736401051484160\`\n`);
		msg.channel.send(embed);
	}
};


async function handleErr(err, msg) {
	msg.channel.send("**Could not complete command:** An error ocurred. The error has been reported.");
	fn.notifyErr(msg.client, err);
	return;
}

async function create_embed(msg, user, self=false) {
	return new Promise(resolve => {
		let title = String();
		if (user.meta.main_type === 6) {
			title = (user.meta.company_url) ? `Works at [${user.meta.company}](${user.meta.company_url})` : "Works at " + user.meta.company;
		} else if (user.meta.main_type === 5) title = "Private person";
		else title = types[user.meta.main_type.toString()].name;

		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setDescription((self)?"Your own profile":"Profile of <@"+user._id+">")
			.addField((self)?"About you":"About "+user.name, `**Name:** ${user.name}\n**Discord:** ${user.meta.discord}#${user.meta.discriminator}\n**Discord ID:** ${user._id}`, true)
			.addField("\u200B", `**Title:** ${title}`, true);
		if (user.meta.main_type <= 4) {
			let socials = String();
			embed.addField("Status", `**Availability:** ${(user.meta.available)?"open for comissions.":"not open for comissions."}\n${(user.meta.tags && user.meta.tags.length)?"**User works with:**\n"+user.meta.tags.join(", "):""}`)
			if(user.portfolios) {
				for (let elm in user.portfolios) {
					if (elm == "1") socials += `[Personal site →](${user.portfolios[elm]}) \n`;
					else if (elm == "8") socials += `[Facebook page →]($${user.portfolios[elm]})\n`;
					else if (portfolios[elm].need_url_prefix) socials += `**${portfolios[elm].name}**: [${portfolios[elm].prefix}${user.portfolios[elm]}](${portfolios[elm].url_prefix}${user.portfolios[elm]})\n`;
					else socials += `**${portfolios[elm].name}**: ${portfolios[elm].prefix}${user.portfolios[elm]}\n`;
				}
				embed.addField("Portfolio and social media", socials);
			}
		}
		return resolve(embed);
	});
}

async function find(msg, args, doc, search=false) {
	if(search) args.shift();
	if (!args.length) {
		marketUserModel.findById(msg.author.id, async (err, user) => {
			if (err) return handleErr(err, msg);
			if (!user) return msg.channel.send("You don't have a profile. Register with `" + doc.prefix + "register`.");
			if (user) {
				let embed = await create_embed(msg, user.toObject(), true);
				return msg.channel.send(embed);
			}
		});
	} else {
		let not_guild_member = false,
			user,
			dm = (msg.channel.type === "dm");
		// Only possible if in guild
		if(!dm) {
			user = msg.guild.members.find(u => u.user.id == args[0]);
			if (!user) user = msg.mentions.members.first() || msg.guild.members.find(u => u.user.tag.toLowerCase() == args.join(" ").toLowerCase()) || msg.guild.members.find(u => u.user.username.toLowerCase() == args.join(" ").toLowerCase());
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
		marketUserModel.findById(user, async (err, user) => {
			if (err) return handleErr(err, msg);
			if (!user) return msg.channel.send(`Could not find user ${(not_guild_member)?"in this guild nor globally.":"in this guild. You could try the Discord ID to search globally."}`);
			let embed = await create_embed(msg, user.toObject());
			return msg.channel.send(embed);
		});
	}
}


async function cmds(msg, args, doc) {
	// Something
	let string = `•    \`${doc.prefix}profile\` get your own profile, if you've registered.\
	\n•    \`${doc.prefix}profile cmds\` lists available commands *(this very message)*.\
	\n•    \`${doc.prefix}profile edit\` initialize profile editor in DM.\
	\n•    \`${doc.prefix}profile types\` list all types of work *(tags)* you can search for.\
	\n•    \`${doc.prefix}profile does <type of work>\` finds users in current guild that does one of the things *(tags/types)* specified.\
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

async function tags(msg, args, doc) {
	let time = Date.now();
	args.shift();
	try {
		if(args.length > 3) return msg.channel.send("**Invalid argument(s):** Maximum amount of tags for search is three.");
		userTags.find({"guilds":{$in:[msg.guild.id]}, "tags":{$in:args}}, ["_id"], {limit:20}, (err,docs) => {
			if(err) {
				return msg.channel.send("An error occurred searching for users.");
			}
			if(!docs.length) return msg.channel.send("**No results:** Could not find any users in this guild that had one of these tags: `"+args.join("`, `")+"`.");

			marketUserModel.find({"_id":{$in:docs.map(u=>u._id)}}, ["_id","meta.discord","meta.discriminator"], {limit:20}, (err,users) => {
				if (err) {
					return msg.channel.send("An error occurred fetching users.");
				}
				if (!users.length) return msg.channel.send("**No results:** Could not fetch the users. Fetching returned 0 retults.");
				
				let string = "**Results:**\nI found "+users.length+" users in this guild that does one of these things: "+args.join(", ")+"\n";
				for(let i=0;i<users.length;i++) {
					string += `${users[i].meta.discord}#${users[i].meta.discriminator} — ID: \`${users[i]._id}\`\n`;
				}
				string += "\nTo inspect of theirs profile, use `"+doc.prefix+"profile <username|tag|id>`.";
				// users.forEach(user => {
				// 	string += `${user.meta.discord}#${user.meta.discriminator} (\`${user._id}\`)\n`;
				// });

				let taken = Date.now()-time;
				if(string.length) {
					return msg.channel.send(string+"\n`[Time taken: "+taken+"ms]`");
				} else {
					console.log(string);
					let taken = time-Date.now();
					return msg.channel.send("Searched, but string was empty. Check logs"+"\n`[Time taken: "+taken+"ms]`");
				}
			});
		});
	} catch(err) {
		console.log(err);
		let taken = time - Date.now();
		return msg.channel.send("Some error: "+err.toString()+"\n`[Time taken: "+taken+"ms]`");
	}
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
					return handleErr(err, msg);
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
					return handleErr(err, msg);
				}
			});
	}
}

/**
 * Outputs a numbered list of portfolio items possible.
 * @returns {String} A numbered list of portfolio items possible.
 */
function social_list() {
	let i=0;
	let string = String();
	for (let port in portfolios) {
		i++;
		string += `\n${num(i)} ${portfolios[port].name}`;
	}
	return string;
}

/**
 * Checks if input is valid social type
 * @param {String|Number} input Any single input.
 * @returns {Number} The creative field number, 0 if no match
 */
function valid_social(input) {
	if(!input) return 0;
	input = input.toLowerCase();
	let i=0;
	for(let port in portfolios) {
		i++;
		if(portfolios[port].synonyms.includes(input)) return i;
	}
	switch(input) {
	case "one":
	case "1":
	case 1:
		return 1;
	case "two":
	case "2":
	case 2:
		return 2;
	case "three":
	case "3":
	case 3:
		return 3;
	case "four":
	case "4":
	case 4:
		return 4;
	default:
		return 0;
	}
}

/**
 * Returns a list of numbers/names of social items
 * @returns {String} Neatly formatted string of social item numbers and names
 */
async function creative_fields() {
	let response = String();
	let i = 0;
	for(let type in types) {
		i++;
		response += `${num(i)} ${types[type].name} \`${types[type].synonyms.join("`, `")}\``;
	}
	return response;
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
 * Returns a list of numbers/names of editable main fields
 * @returns {String} Neatly formatted string of field numbers and names
 */
async function fields_list() {
	let response = "\n<:One:588844523329683476> Display name | `name`, `display`\
		\n<:Two:588844524659540030> Tags | `tag`|`tags`|`type`|`types`\
		\n<:Three:588844524659539972> Minimum budgets | `budget`|`min`|`minimum`\
		\n<:Four:588844515520020598> Company name | `company`\
		\n<:Five:588844516283252736> Company website | `site`|`company-site`|`company-url`\
		\n<:Six:588844524332384276> E-mail | `email`\
		\n<:Seven:588844523938119680> Social media and portfolio's | `social`|`socials`|`portfolio`\
		\n<:Eight:588844512286343179> Creative field / title | `title`|`field`|`creative`";
	return response;
}

/**
 * Checks if input is valid creative field type
 * @param {String|Number} input Any single input.
 * @returns {Number} The creative field number, 0 if no match
 */
function creative_type(input) {
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

/**
 * Checks if input is any valid sub-field you can edit
 * @param {String|Number} input A single input to check
 * @returns {Number} The number type, 0 if no match
 */
function isValidSub(input) {
	if(!input) return 0;
	switch (input.toLowerCase()) {
	case "1":
	case 1:
	case "one":
	case "name":
	case "display":
		return 1;
	case "2":
	case 2:
	case "two":
	case "tag":
	case "tags":
	case "type":
	case "types":
		return 2;
	case "3":
	case 3:
	case "three":
	case "budget":
	case "min":
	case "minimum":		
		return 3;
	case "4":
	case 4:
	case "four":
	case "company":
		return 4;
	case "5":
	case 5:
	case "five":
	case "site":
	case "url":
	case "website":
	case "company-site":
	case "company-url":
		return 5;
	case "6":
	case 6:
	case "six":
	case "email":
	case "e-mail":
	case "mail":
		return 6;
	case "7":
	case 7:
	case "seven":
	case "social":
	case "socials":
	case "portfolio":
		return 7;
	case "8":
	case 8:
	case "eight":
	case "title":
	case "field":
	case "creative":
		return 8;
	default:
		return 0;
	}
}

async function show_types(msg, args, doc) {
	if(args.length===0) {
		let response = "Give me a creative field you want to see tags for.\n*Reply with the corresponding number:*\n**Creator**\n<:One:588844523329683476> Designer\n<:Two:588844524659540030> Artist\n<:Three:588844524659539972> VFX/Video/Motion Editor\n<:Four:588844515520020598> Other creator";
		return send(msg, doc, response, show_types);
	} else {
		let type = creative_type(args[0]);
		
		if(!type) return send(msg, doc, "**Invalid response:** You must use one of the numbers or name of the creative field.", show_types);
		else {
			let embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription("All tags for "+types[type.toString()].name);
			embed = gen_tags_embed(embed, type);
			embed.addField("Using the tags", "You can search for a user in this guild that does one of the tags. You can search **up to three tags** at a time, and it will return users that have at least one of them.\n**Command:** `"+doc.prefix+"profile does <tag(s)>`.");
	
			return msg.channel.send(embed);
		}
	}
}

function gen_tags_embed(embed, type) {
	let col1 = String();
	let col2 = String();
	let half = Math.ceil(types[type.toString()].tags.length/2);
	let sorted_tags = types[type.toString()].tags.sort();
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

async function edit(msg, args, doc) {
	if(!args.length<=1) {
		let response = `**Possible sub-commands:**\
\n•    \`${doc.prefix}profile set email <email>\` set your email.\
\n•    \`${doc.prefix}profile set social <number|name> <value>\` sets a social item. See \`${doc.prefix}profile socials\` for list of number/names.\
\n•    \`${doc.prefix}profile set name <name>\` change the preferred name. Defaults to Discord username.\
\n•    \`${doc.prefix}profile set tags <tags>\` replaces current tags with given list.\
\n•    \`${doc.prefix}profile set available <true|yes|false|no>\` sets your commissions availability status.\
\n•    \`${doc.prefix}profile set company <name>\` sets a company you work for.\
\n•    \`${doc.prefix}profile set company-site <url>\` sets the website of the company.\
\n•    \`${doc.prefix}profile set minimum <number>\` sets minimum budgets you work with, in USD\
\n•    \`${doc.prefix}profile set title <type> [tags]\` sets the creative field type, which determine possible tags. Optionally change tags right away too.\
\n
\n**Removing information:**\
\nUse \`unset\` instead of \`set\`. Except socials, the last argument is not needed.\
\n*Examples:*\
\n•    \`${doc.prefix}profile unset email\`\
\n•    \`${doc.prefix}profile unset company-site\`\
\n•    \`${doc.prefix}profile unset social 4\`\
\n•    \`${doc.prefix}profile unset social twitter\``;
		return msg.channel.send(response);
	} else if (args[1].toLowerCase()==="set"||args[1].toLowerCase()==="add") {
		args.shift();
		return edit_set(msg, args, doc);
	} else if(args[1].toLowerCase()==="unset"||args[1].toLowerCase()==="delete") {
		args.shift();
		return edit_unset(msg, args, doc);
	}
}

let rg = {
	site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
	fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
	username: new RegExp(/^[a-zA-Z0-9-_.]+$/, "ig"),
	name_or_username: new RegExp(/^[a-zA-Z0-9-_.]+$/, "ig"),
	name: new RegExp(/^[a-zA-Z- ]+$/, "ig")
};


async function edit_set(msg, args, doc) {
	let sub = isValidSub(args[0]);
	if(!sub) return msg.channel.send("**Invalid argument:** `"+args[0]+"` is not a valid sub-command parameter. See `"+doc.prefix+"profile edit` for list of number/names of fields.");
	if(!args[1]) return msg.channel.send("**Missing argument(s):** You must give the value to set "+args[0].toLowerCase()+" to as well.");
	switch(sub) {
	case 1:
		// name
		if(rg.name_or_username.test(args[1])) {
			update(msg.user.id, {$set:{name:args[1], last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Changed your display name to "+args[1]+".");
				})
				.catch(err => {
					return handleErr(err, msg);
				});
		} else return msg.channel.send("**Invalid argument:** `"+args[1]+"` is not a valid name.");
		break;
	case 2:
		// tags -> Requires to check amount, and if it fits the meta.main_type, as well as instead change the userTags model
		update_tags(msg, doc, args)
			.then(r=>{
				return msg.channel.send(r.data);
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 3:
		// budget
		args[1].replace(/(usd)|[$]/ig, "");
		if(isNaN(args[1])) {
			return msg.channel.send("**Invalid argument:** Where you said `"+args[1]+"`, you **must instead use a whole number** that will be listed as USD.");
		} else {
			try {
				args[1] = parseInt(args[1]);
			} catch(err) {
				return msg.channel.send("**Invalid argument:** Where you said `"+args[1]+"`, you **must instead use a whole number** that will be listed as USD.");
			}
			update(msg.author.id, {$set:{"meta.min_budget":args[1], last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** You now advertise working with a **minimum budget of $"+args[1]+"**.");
				})
				.catch(err =>{return handleErr(err, msg);});
		}
		break;
	case 4:
		// company
		args.shift();
		if(args.join(" ").length>40) {
			update(msg.author.id, {$set:{"meta.company":args.join(" "), last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Now showing that you work at "+args.join(" ")+".");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** The **company name is too long**. That can't be right, can it? Sounds like someone made a poor decision.");
		break;
	case 5:
		// company site
		if(rg.site.test(args[1]) || args[1].length>40) {
			update(msg.author.id, {$set:{"meta.company_url":args[1], last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Now linking your company at the URL `"+args[1]+"`.");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** Either your link is really long *(40+ chars)*, or it does not conform to common link formats.");
		break;
	case 7:
		// socials
		if (valid_social(args[1])) {
			///////////////////////////////////
			let num = valid_social(args[1]);
			args = args.slice(2).join(" ");

			let rg = {
				site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
				fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
				username: new RegExp(/^[a-zA-Z0-9-_.]+$/, "ig")
			};
			switch (parseInt(num)) {
			case 1:
				// Type: site
				if(!/https?:\/\//i.test(args)) args = "https://"+args;
				if(!rg.site.test(args)) return msg.channel.send("**Invalid argument:** The input after the number did not match that of a valid website URL. Try again.");
				else {
					//TODO: Update DB here. num = key, args = value
					update(msg.author.id, {$set:{[`profiles.${num}`]:args}})
						.then(()=>{
							return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: `"+portfolios[num.toString()].prefix+args+"`.");
						}).catch(err=>{return handleErr(err, msg);});
				}
				break;
			case 8:
				// Type: facebook
				if(!/https?:\/\//i.test(args)) args = "https://"+args;
				if(!rg.fb.test(args)) return msg.channel.send("**Invalid argument:** The input after the number did not match that of a valid Facebook URL. Try again.");
				else {
					//TODO: Update DB here. num = key, args = value
					update(msg.author.id, {$set:{[`profiles.${num}`]:args}})
						.then(()=>{
							return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: `"+portfolios[num.toString()].prefix+args+"`.");
						}).catch(err=>{return handleErr(err, msg);});
				}
				break;
			default:
				// All other is of type username
				args = args.replace("@", "");
				// Test matching URL, meaning the latter reg determine if URL or username
				if(rg.username.test(args)) return {pass:true, data:args, type:num};
				
				if (rg.site.test(args) && /\//g.test(args)) {
					let usr = args.split("/");
					usr = usr[usr.length-1];
					if(usr.length && rg.username.test(usr)) {
						//TODO: Update DB here. num = key, args = value
						update(msg.author.id, {$set:{[`profiles.${num}`]:args}})
							.then(()=>{
								return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: "+portfolios[num.toString()].prefix+args+".");
							}).catch(err=>{return handleErr(err, msg);});
					} else return msg.channel.send("**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again.");
				} else return msg.channel.send("**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again.");
			}
			/////////////////////////////////////
		} else return msg.channel.send("**Invalid argument:** "+args[1]+" is not a valid social item. See `"+doc.prefix+"profile socials` for a list of socail numbers/names.");
		break;
	case 8:
		// Creative field
		//TODO: Check if tags were passed as well.
		if (creative_type(args[1])) {
			update(msg.author.id, {$set:{"meta.main_type":creative_type(args[1])}})
				.then(()=>{
					if(args.length>1) {
						// Test if tags are valid, and if exceeds limnit. Perform setting.
						return update_tags(msg, doc, args.slice(1));
					} else {
						// No tags were present, so just remove them.
						return userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}});
					}
				})
				.then(r => {
					if(args.length>1) {
						if(r.pass) {
							// All went well, updating title and tags.
							return msg.channel.send("**Title - success:** Your new title is **" + types[creative_type(args[1]).toString()].name + "**.\
							\n**Tags - success:** All of your tags were also updated: `"+args.slice(1).join(", ")+"`");
						} else {
							// Title set, but tags had failure.
							userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}}, err =>{
								if(err) return handleErr(err, msg);
								// Since tags failed, remove them.
								return msg.channel.send("**Title - success:** Your new title is **" + types[creative_type(args[1]).toString()].name + "**.\
								\n**Tags:**"+r.data+"\
								\n**As a result:** all of your tags were removed. You can set new tags with `" + doc.prefix + "profile set tags <tags>`, or see possible ones first with `" + doc.prefix + "profile tags`.");
							});
						}
					} else {
						// All went well setting title, but user did not specify tags.
						return msg.channel.send("**Success:** Your new title is **" + types[creative_type(args[1]).toString()].name + "**, but your tags were removed as you changed field.\
						\nYou can set new tags with `" + doc.prefix + "profile set tags <tags>`, or see possible ones first with `" + doc.prefix + "profile tags`.");
					}
				})
				.catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid input:** The creative field `"+args[1]+"` is not one I consider valid. See `"+doc.prefix+"profile SOMETHING HERE` for a list of creative fields numbers/names.");
		//TODO: Some command to see valid Creative field names/numbers
		break;
	}
}

async function update_tags(msg, doc, args) {
	return new Promise((resolve,reject) => {
		marketUserModel.findById(msg.author.id, ["meta.main_type"], (err,user) => {
			if(err)return reject(err);
			if(!user)return resolve({pass:false, data:"**Could not complete command:** It seems your account with me has ceased to exist by the time you reach this point. Try to register. If that doesn't work, submit bug report and/or join support guild."});
			args.shift();
			let valid = types[user.meta.main_type.toString()].tags.sort();
			let allGood = args.every(v => valid.includes(v.toLowerCase()));
			if(allGood) {
				if(args.length<types[user.meta.main_type.toString()].max_tags) {
					userTags.updateOne({_id:msg.author.id}, {$set:{"tags":args}}, err => {
						if(err) return reject(err);
						return resolve({pass:true, data:"**Success:** You can now be found if anyone search for someone that does one of the following: "+args.join(", ")+"."});
						//TODO: If using last_updated, I need to update marketUserModel too: update(msg.author.id, {$set:last_update:Date()})
					});
				} else return resolve({pass:false, data:"**Too many arguments:** You exceeded the max amount of tags possible for your creative field. The **max is "+types[user.meta.main_type.toString()].max_tags+"**, while **you used "+args.length+"**."});
			} else {
				let invalid = args.map(v=>!valid.includes(v.toLowerCase()));
				return resolve({pass:false, data:"**Invalid argument(s):** One or more of the tags you listed were not valid for your group: **`"+invalid.join(", ")+"`**. See `"+doc.prefix+"profile tags` for list of all tags."});
			}
		});
	});
}

async function edit_unset(msg, args, doc) {
	let sub = isValidSub(args[0]);
	if(!args[0]) return msg.channel.send("**Missing argument(s):** You must give the value to set parameter to unset. See `" + doc.prefix + "profile edit` for list of fields.");
	if (!sub) return msg.channel.send("**Invalid argument:** `" + args[0] + "` is not a valid sub-command parameter. See `" + doc.prefix + "profile edit` for list of fields.");
	switch(sub) {
	case 1:
		// name
		update(msg.author.id, {$set:{"name":msg.author.username}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed your displayname, but since it cannot be empy, it's **set to "+msg.author.username+"**.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 2:
		// tags
		userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}}, err => {
			if(err) return handleErr(err, msg);
			return msg.channel.send("**Success:** Removed all of your tags.");
		});
		break;
	case 3:
		// budget
		update(msg.author.id, {$set:{"meta.min_budget":0}})
			.then(()=>{
				return msg.channel.send("**Success:** Minimum budget **set to $0**, so it will not show up.");
			}).catch(err=>{return handleErr(err,msg);});
		break;
	case 4:
		// company
		update(msg.author.id, {$set: {"meta.company":null}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed company name. If you have a company URL specified, it will show that instead.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 5:
		// company site
		update(msg.author.id, {$set:{"meta.company_url":null}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed company URL. If you have a company name specified, it will show that instead.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 7:
		// socials
		if (!args[1]) return msg.channel.send("**Missing argument:** You must give which social to remove. See `"+doc.prefix+"profile socials` for list of number/names.");
		else if (valid_social(args[1])) {
			console.log(valid_social(args[1]), portfolios[valid_social(args[1].toString())]);
			update(msg.author.id, {$unset:{["portfolios."+valid_social(args[1].toString())]:valid_social(args[1].toString())}})
				.then(()=>{
					return msg.channel.send("**Succes:** **"+portfolios[args[1]].name+" removed** — if you had any listed.");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** `"+args[0]+"` is not a valid social item. See `"+doc.prefix+"profile socials` for list of number/names.");
		break;
	case 8:
		// Creative field -> Sets to private person, remove tags.
		update(msg.author.id, {$set:{"meta.main_type":5}})
			.then(()=>{
				return userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}});
			}).then(()=>{
				return msg.channel.send("**Success:** Reverted to default of **private person**. Additionally, **any tags you had were removed**.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	}
}

async function update(userId, data) {
	return new Promise((resolve,reject) => {
		marketUserModel.updateOne({_id:userId}, data, (err,r) => {
			if(err) return reject(err);
			if(!r.n) return reject(new Error("**Could not complete command:** Found no matches for what you specified."));
			return resolve(true);
		});
	});
}