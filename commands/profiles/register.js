/* eslint-disable no-console */
const fn = require("../../util/command-utilities");
const Sentry = require("../../util/extras");
const response = require("./responses.json");
const {portfolios,creator_types} = require("./config.json");
const {marketUserModel,userTags} = require("../../util/database");
const {set_session,del_session} = require("../../util/session");
const Discord = require("discord.js");
const re = require("../../util/response_functions");

module.exports = _register;
async function _register(msg, doc) {
	getUser(msg.author.id)
		.then(r => {
			if(r) return msg.reply(response.exist+`\nTo manage your profile, see \`${doc.prefix}profile cmds\` for commands.`);
			if(msg.channel.type!=="dm") {
				msg.reply("<:Yes:588844524177195047> Starting registration progress in your DM's.");
			}
			set_session(msg.author.id, "register");
			let meta = {
				_id: msg.author.id,
				discrim: msg.author.discriminator,
				username: msg.author.username,
				tags: [],
				title: null,
				portfolios: {},
				open: true,
				company: null,
				companySite: null,
				type: 5,
				flags:0
			};
			
			//TODO: Incorporate list generated from config.market.creator_types at some point
			return send(msg, doc, response.isType, meta, catch_isType);
		})
		.catch(err => {
			del_session(msg.author.id, "register");
			if ([50007, 50013].includes(err.code)) {
				return msg.reply("… actually, seems like I couldn't DM you. No permission. Check your inbox open status, possibly if blocked specifically from this guild.");
			} else {
				re.notifyErr(msg.client, err);
				Sentry.captureException(err);
				return msg.reply("… actually, seems like I couldn't initiate registration. An error ocurred. The error has been reported.");
			}
		});
}

async function handleErr(err, msg, meta, prefix, reply=null) {
	del_session(msg.author.id, "register");
	if(reply) return msg.reply(reply);
	if(err.size===0) {
		save(meta, msg.client)
			.then(()=>{
				return msg.author.send("**<:Info:588844523052859392> Time ran out.**\nI saved the information you provided so far.\nTo add/edit data on your profile, see `"+prefix+"profile cmds`.");
			})
			.catch(err=>{
				Sentry.captureException(err);
				re.notifyErr(msg.client, err);
				if(err.code && err.code===50007) return;
				return msg.author.send("**<:Info:588844523052859392> Time ran out.**\nAdditionally, an error occurred trying to save what you provided so far. Try `"+prefix+"register` again at a later time.");
			});
	} else {
		if (msg.channel.type!=="dm" && [50007, 50013].includes(err.code)) {
			return msg.reply("… actually, seems like I couldn't DM you. No permission. Check your inbox open status, possibly if blocked specifically from this guild.");
		} else {
			if(meta) console.log(meta);
			Sentry.captureException(err);
			re.notifyErr(msg.client, `${err.toString()}\n**Meta:** ${JSON.stringify(meta)}`);
			save(meta, msg.client)
				.then(() => {
					return msg.author.send("**<:Stop:588844523832999936> An error occurred.**\nHowever, I saved the information you provided so far.\nTo add/edit data on your profile, see `" + prefix + "profile cmds`.");
				})
				.catch(err => {
					Sentry.captureException(err);
					re.notifyErr(msg.client, err);
					if(err.code && err.code===50007) return;
					return msg.author.send("**<:Stop:588844523832999936> An error occurred.**\nAdditionally, an error occurred trying to save what you provided so far. Try `" + prefix + "register` again at a later time.");
				});
		}
	}
}

async function save(meta, client) {
	return new Promise((resolve,reject) => {
		
		let title = String();
		try {
			title = (meta.company) ? meta.company: creator_types[meta.type.toString()].name; // One will have null
		} catch(err) {
			title = null;
		}
		let user = new marketUserModel({
			_id: meta._id,
			last_updated: Date(),
			name: meta.username,
			meta: {
				title: title,
				available: meta.open,
				discord: meta.username,
				discriminator: meta.discrim,
				main_type: meta.type,
				company: meta.company,
				company_url: meta.companySite
			},
			portfolios: meta.portfolios,
			flags: meta.flags
		});
		let userTagElm = new userTags({
			_id: meta._id,
			tags: meta.tags,
			available: meta.open,
			guilds: find_users_guilds(client, meta._id)
		});
		user.save(err => {
			if(err) return reject(err);
			userTagElm.save(err => {
				if(err) return reject(err);
				return resolve(true);
			});
		});
	});
}

function find_users_guilds(client, userId) {
	return client.guilds.filter(g => g.members.has(userId)).keyArray();
}

/**
 * Removes Discord formatting symbols (*`>~_|)
 * @param {String} text The text to remove symbols from
 * @returns {String} The input text without the symbols
 */
function noFormatting(r) {
	return r.replace(/[*`>~_|]/ig, "");
}

async function getUser(userId) {
	return new Promise((resolve,reject) => {
		marketUserModel.findOne({_id:userId}, (err,doc) => {
			if(err) return reject(err);
			return resolve(doc);
		});
	});
}

async function send(msg, doc, reply, meta, callback) {
	if(reply) {
		// Pass a message first
		fn.dmAndAwait(msg.author, reply)
			.then(r => {
				return callback(msg, doc, meta, r);
			})
			.catch(err=> {
				return handleErr(err, msg, meta, doc.prefix);
			});
	} else {
		// Pass through to the callback directly.
		return callback(msg, doc, meta);
	}
}

function gen_tags_embed(msg, meta) {
	let col1 = String();
	let col2 = String();
	let half = Math.ceil(creator_types[meta.type.toString()].tags.length/2);
	let sorted_tags = creator_types[meta.type.toString()].tags.sort();
	sorted_tags.forEach((tag, i) => {
		if (i < half) {
			if(i===0) col1 +=tag;
			else col1 += "\n" + tag;
		} else {
			col2 += "\n" + tag;
		}
	});
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.setDescription(`Tags possible for ${creator_types[meta.type.toString()].name}`)
		.addField("Reply with tags", "Give me a list of tags that describe the type(s) of work you do / are open to comissions for, separated by comma.")
		.addField("Max number tags", `Maximum of **${creator_types[meta.type.toString()].max_tags} tags**`)
		.addField("Tags", col1, true)
		.addField("\u200B", col2, true);
	return embed;
}

function get_portfolio_list(msg, meta) {
	let string = String();
	for (let place in portfolios) {
		if (meta.portfolios.hasOwnProperty(place)) {
			string += `~~${place}. ${portfolios[place].name}~~ **Added:** ${meta.portfolios[place]}\n`;
		} else {
			string += `${place}. ${portfolios[place].name} — Reply with: \`${place} <${portfolios[place].type}>\`\n`;
		}
	}
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.setDescription("Social media and portfolio's")
		.addField("Adding", "One item at a time. Find the social you want to add, and use the 'Reply with' to add a social item. Include the number, and replace `<'url'|'username'>` with the corresponding data.")
		.addField("Replacing", "Re-enter the social item the same way you did initially to replace it.")
		.addField("Checking", "Get a list of possible social's, up to date with what you have already entered, by saying `list`.")
		.addField("Examples", "`4 VirtusGraphics`\n`1 https://virtusgraphics.com`")
		.addField("Adding a social connection/portfolio", string);
	return embed;
}

async function validate_portfolio(r) {
	return new Promise(resolve => {
		let nums = Object.keys(portfolios);
		let args = r.split(" ");
		console.log(r);
		console.log(args);
		if(!args.length) return resolve({pass:false, data:"**Missing argument:** There was no input. Example: `1 www.virtusgraphics.com` Try again."});
		if(args.length < 1) return resolve({pass:false, data:"**Missing argument(s):** The input must start with the number, followed by space and then the input. Example: `1 www.virtusgraphics.com`. Try again."});
		if(isNaN(args[0])) return resolve({pass:false, data:"**Invalid argument:** The input must start with the number, followed by space and then the input. Example: `1 www.virtusgraphics.com`. Try again."});
		if(!nums.includes(args[0])) return resolve({pass:false, data:"**Invalid argument:** The input number at the start must be in the list. Try again, or write `list` to see all possible ones. Example: `1 www.virtusgraphics.com`. Try again."});
		
		let num = args.shift();
		args = args.join(" ");
		
		let rg = {
			site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
			fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
			username: new RegExp(/^[a-zA-Z0-9-_.]+$/, "ig")
		};
		switch (parseInt(num)) {
		case 1:
			// Type: site
			if(!/https?:\/\//i.test(args)) args = "https://"+args;
			if(!rg.site.test(args)) return {pass:false, data:"**Invalid argument:** The input after the number did not match that of a valid website URL. Try again."};
			else return resolve({pass:true, data:args, type:num});
		case 8:
			// Type: facebook
			if(!/https?:\/\//i.test(args)) args = "https://"+args;
			if(!rg.fb.test(args)) return {pass:false, data:"**Invalid argument:** The input after the number did not match that of a valid Facebook URL. Try again."};
			else return resolve({pass:true, data:args, type:num});
		default:
			// All other is of type username
			args = args.replace("@", "");
			// Test matching URL, meaning the latter reg determine if URL or username
			if(rg.username.test(args)) return resolve({pass:true, data:args, type:num});
		
			if (rg.site.test(args) && /\//g.test(args)) {
				let usr = args.split("/");
				usr = usr[usr.length-1];
				if(usr.length && rg.username.test(usr)) {
					return resolve({pass:true, data:usr, type:num});
				} else return resolve({pass:false, data:"**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again."});
			} else return resolve({pass:false, data:"**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again."});
		}
	});
}
/****************************************
 *	CATCH X BLOCKS
 * **************************************/
async function catch_isType(msg, doc, meta, r) {
	if(isNaN(r)) return send(msg, doc, response.not_valid_num, meta, catch_isType);
	meta.type = parseInt(r);
	//TODO: Incorporate list generated from config.market.creator_types
	if (meta.type > 6) return send(msg, doc, "**Invalid argument:** Pick *one* option form the provided list.", meta, catch_isType);
	if(meta.type>=5) {
		// Is customer type
		if(meta.type===6) return send(msg, doc, response.askCompany, meta, catch_customerCompany);
		return give_info(msg, doc, meta, null);
	} else {
		// Is creator type
		return send(msg, doc, response.openForComissions, meta, catch_comissionsOpen);
	}
}

async function catch_customerCompany(msg, doc, meta, r) {
	if (r.toLowerCase() === "no") {
		meta.company = null;
		meta.portfolios = null;
		meta.tags = null;
		meta.type = 5;
		meta.companySite = null;
		return give_info(msg, doc, meta, null);
	}

	r = noFormatting(r);
	if(r.length<=1) return send(msg, doc, response.tooShort, meta, catch_customerCompany);
	if(r.length>60) return send(msg, doc, response.tooLong, meta, catch_customerCompany);
	meta.portfolios = null;
	meta.tags = null;
	meta.company = r;
	return send(msg, doc, response.companySite, meta, catch_companyUrl);
}

async function catch_companyUrl(msg, doc, meta, r) {
	if(r.toLowerCase()==="no") {
		meta.companySite = null;
		return give_info(msg, doc, meta, null);
	}
	let siteReg = new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig");
	if(!siteReg.test(r)) return send(msg, doc, response.notValidSite, meta, catch_companyUrl);
	meta.companySite = r;
	return give_info(msg, doc, meta, null);
}

async function catch_comissionsOpen(msg, doc, meta, r) {
	meta.company = null;
	meta.companySite = null;
	// Yes or no
	if(r.toLowerCase()==="no") {
		// Nope
		meta.open = false;
		return send(msg, doc, response.askTagsAnyway, meta, ask_tags);
	} else if(r.toLowerCase()==="yes") {
		// Yep
		meta.open = true;
		return send(msg, doc, gen_tags_embed(msg, meta), meta, catch_tags);
	} else return send(msg, doc, response.yesOrNo, meta, catch_comissionsOpen);
}

async function ask_tags(msg, doc, meta, r) {
	// Catch 'yes' or 'no'.
	if(r.toLowerCase()==="yes") return send(msg, doc, gen_tags_embed(msg, meta), meta, catch_tags);
	else if(r.toLowerCase()==="no") {
		meta.tags = null;
		return send(msg, doc, response.askPortfolio, meta, catch_portfolio);
	}
	else return send(msg, doc, response.yesOrNo, meta, ask_tags);
}

async function catch_tags(msg, doc, meta, r) {
	// Catch the tags given
	if(r.toLowerCase()!=="next") {
		// Define list of variables
		let max = creator_types[meta.type.toString()].max_tags;
		let tags = r.split(/, |,+/ig);
		let invalidOnes = tags.filter(t => !creator_types[meta.type.toString()].tags.includes(t.toLowerCase()));
		let validOnes = tags.filter(t => creator_types[meta.type.toString()].tags.includes(t.toLowerCase()));
		let response = String();

		// Use same response in all cases where user gives no valid tags
		if (!validOnes.length) {
			response = "**Invalid argument(s):** Your reply didn't contain any valid tags. Try again with a list separated by comma.";
			return send(msg, doc, response, meta, catch_tags);
		}

		// First determine if user already entered some tags, AND have not reached maximum amount. If reached max, basically starting all over.
		if(meta.tags.length && meta.tags.length !== max) {
			//* User already have added some tags, adding to max it out.
			// nLeft is how many the user have left.
			let nLeft = max - meta.tags.length;
			meta.tags.push(...validOnes.slice(0, nLeft));
			if(invalidOnes.length) {
				// Had invalid tags
				response = "There was some invalid tags in there:\n`"+invalidOnes.join("`, `")+"`";

				if (validOnes.length > nLeft) response += `\nFurthermore, you gave too many valid tags. Max is **${max}**, which means you had **${validOnes.length-nLeft} too many** *(excluding the invalid ones)*.  Replying with a new list will entirely replace the current.`;
				else if (meta.tags.length===max) response += "\nDisregarding the invalid ones, you have now exactly maxed out your tags list.\nReplying with a new list will entirely replace this one.";
				else response += `\nAs a result, you still have **${max-meta.tags.length} tags left**. Reply with more tags to fill out the list.`;
				
				response += `\nHere's you current list of tags:\n\`${meta.tags.join("`, `")}\``;
				response += "\n**To move on, write `next`.**";
			} else {
				// Had no invalid tags
				if (validOnes.length > nLeft) response = `You gave too many tags. Max is **${max}**, which means you had **${validOnes.length-nLeft} too many**. Replying with a new list will entirely replace the current.`;
				else if (meta.tags.length === max) response = `Great, you've used all your tags slots. Tags can be changed later too, using the \`${doc.prefix}profile tags\` command. Replying with a new list will entirely replace the current.`;
				else response = `You have **${max-meta.tags.length} tags left** you can use. Reply with more if you want to use more.`;
				
				response += `\nHere's you current list of tags:\n\`${meta.tags.join("`, `")}\``;
				response += "\n**To move on, write `next`.**";
			}
		} else {
			//* User is first now coming to this part, or is replacing entire list.
			meta.tags = validOnes.slice(0, max);

			if (invalidOnes.length) {
				// Had invalid tags:
				response = "There was some invalid tags in there:\n`"+invalidOnes.join("`, `")+"`";
				
				if(validOnes.length>max) response += `\nFurthermore, you gave too many valid tags. Max is **${max}**, which means you had **${validOnes.length-max} too many** *(excluding the invalid ones)*.`;
				else if(validOnes.length===max) response += "\nDisregarding the invalid ones, you have now exactly maxed out your tags list.\nReplying with a new list will entirely replace this one.";
				else response += `\nAs a result, you still have **${max-validOnes.length} tags left**. Reply with more tags to fill out the list.`;

				response += `\nHere's you current list of tags:\n\`${meta.tags.join("`, `")}\``;
				response += "\n**To move on, write `next`.**";
			} else {
				// Had no invalid tags:
				if (validOnes.length>max) response = `You gave too many tags. Max is **${max}**, which means you had **${validOnes.length-max} too many**. Replying with a new list will entirely replace the current.`;
				else if (validOnes.length === max) response = `Great, you've used all your tags slots. Tags can be changed later too, using the \`${doc.prefix}profile tags\` command. Replying with a new list will entirely replace the current.`;
				else response = `You have **${max-validOnes.length} tags left** you can use. Reply with more if you want to use more.`;
				response += `\nHere's you current list of tags:\n\`${meta.tags.join("`, `")}\``;
				response += "\nIf not, **reply with `next` to move on**.";
			}
		}

		// It is always the same 'send' statement.
		return send(msg, doc, response, meta, catch_tags);
	} else {
		return send(msg, doc, get_portfolio_list(msg, meta), meta, catch_portfolio);
	}
}

async function catch_portfolio(msg, doc, meta, r) {
	// Catch the portfolio listing.
	if(r.toLowerCase()==="list") return send(msg, doc, get_portfolio_list(msg, meta), meta, catch_portfolio);
	else if(r.toLowerCase()==="done") return send(msg, doc, null, meta, give_info);

	let data = await validate_portfolio(r);
	console.log(data);
	if(!data.pass) return send(msg, doc, data.data, meta, catch_portfolio);
	meta.portfolios = {...meta.portfolios, [data.type.toString()]:data.data};
	return send(msg, doc, `Social item **${portfolios[data.type.toString()].name}** added as: ${data.data}.\n**Reply with…**\n•    a new/existing social item to add/change\n•    \`list\` to view possible ones and up to date list of added\n•    \`done\` to finish registration.`, meta, catch_portfolio);
}

async function give_info(msg, doc, meta) {
	// End of registration. Give general info.
	del_session(msg.author.id, "register");
	save(meta, msg.client)
		.then(()=>{
			let title = String();
			if(meta.type===6) {
				title = (meta.companySite) ? `Works at [${meta.company}](${meta.companySite})` : "Works at "+meta.company;
			} else if(meta.type===5) title = "Private person";
			else title = creator_types[meta.type.toString()].name;

			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.setDescription("Summary of registration")
				.addField("About you", `**Name:** ${meta.username}\n**Discord:** ${meta.username}#${meta.discrim}`, true)
				.addField("\u200B", `**Title:** ${title}`, true);
			if(meta.type<=4) {
				let socials = String();
				for(let elm in meta.portfolios) {
					if (elm == "1") socials += `[Personal site →](${meta.portfolios[elm]}) \n`;
					else if(elm=="8") socials += `[Facebook page →]($${meta.portfolios[elm]})\n`;
					else if (portfolios[elm].need_url_prefix) socials += `**${portfolios[elm].name}**: [${portfolios[elm].prefix}${meta.portfolios[elm]}](${portfolios[elm].url_prefix}${meta.portfolios[elm]})\n`;
					else socials += `**${portfolios[elm].name}**: ${portfolios[elm].prefix}${meta.portfolios[elm]}\n`;
				}
				embed.addField("Status", `**Availability:** ${(meta.open)?"open for comissions.":"not open for comissions."}\n${(meta.tags)?"**User works with:**\n"+meta.tags.join(", "):""}`)
					.addField("Portfolio and social media", socials);
			}
			embed.addField("Editing profile", "You can at any time change any of the fields, or even add more information, through `"+doc.prefix+"profile edit`. Use  `"+doc.prefix+"profile cmds` to see all possible actions.");
			return msg.author.send("**Registration complete!**", {embed});
		})
		.catch(err=>{
			return handleErr(err, msg, meta, doc.prefix);
		});
	// Recap:
}