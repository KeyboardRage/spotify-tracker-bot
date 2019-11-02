/* eslint-disable no-console */
const fn = require("../../util/command-utilities");
const Sentry = require("../../util/extras");
const response = require("./responses.json");
const types = require("../../data/config.json").market.creator_types;
const portfolios = require("../../data/config.json").market.portfolios;
const marketUsers = require("../../util/database").marketUserModel;
const Discord = require("discord.js");

module.exports = {
	/**
	 * Initiate register account sequence.
	 * @param {"msg"} msg The original message object
	 * @param {Array} args The command arguments
	 * @param {Object} doc The guild document
	 */
	register: async function (msg, args, doc) {
		return await _register(msg, args, doc);
	}
};

async function _register(msg, args, doc) {
	// if(msg.channel.type!=="dm") {
	// 	msg.reply("<:Yes:588844524177195047> Starting registration progress in your DM's.");
	// }
	return msg.channel.send("OK");
	getUser(msg.author.id)
		.then(r => {
			let meta = {_id:msg.author.id, username:msg.author.username};
			// if(r) return msg.reply(response.exist+`\nTo manage your profile, see \`${doc.prefix}profile cmds\` for commands.`);
			//TODO: Incorporate list generated from config.market.creator_types:
			return send(msg, doc, response.isType, meta, catch_isType);
		})
		.catch(err => {
			if (msg.channel.type !== "dm" && [50007, 50013].includes(err.code)) {
				return msg.reply("… actually, seems like I couldn't DM you. No permission.");
			} else {
				console.log(err);
				// Sentry.captureException(err);
				return msg.reply("… actually, seems like I couldn't initiate registration. An error ocurred. The error has been reported.");
			}
		});
}

async function handleErr(err, msg, reply=null) {
	console.error(err);
	Sentry.captureException(err);
	if(reply) return msg.reply(reply);
	return msg.reply("An error occurred.");
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
		marketUsers.findOne({_id:userId}, (err,doc) => {
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
				return handleErr(err, msg);
			});
	} else {
		// Pass through to the callback directly.
		return callback(msg, doc, meta);
	}
}

function gen_tags_embed(msg, meta) {
	let col1 = String();
	let col2 = String();
	types[meta.type.toString()].forEach((tag, i) => {
		if (i > Math.ceil(types[meta.type.toString()] / 2)) {
			col1 += "\n" + tag;
		} else {
			col1 += "\n" + tag;
		}
	});
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.setDescription(`Tags possible for ${types[meta.type.toString()].name}`)
		.addField("Reply with tags", "Give me a list of tags that describe the type(s) of work you do / are open to comissions for, separated by comma.", true)
		.addField("Max number tags", `Maximum of **${types[meta.type.toString()].max_tags} tags**`, true)
		.addField("Tags", col1, true)
		.addField("\u200B", col2, true);
	return embed;
}

function get_portfolio_list(msg, meta) {
	let string = String();
	for (let place in portfolios) {
		if (meta.portfolios.hasOwnProperty(place)) {
			string += `~~${place}. ${portfolios[place].name}~~ **Added:** ${meta.portfolios[place]}`;
		} else {
			string += `${place}. ${portfolios[place].name}\nReply with: \`${place} <${portfolios[place].type}>\``;
		}
	}
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.setDescription(`Portfolio's`)
		.addField("Adding", "One item at a time. Find the portfolio you want to add, and use the 'Reply with' to add a portfolio item. Include the number, and replace `<'url'|'username'>` with the corresponding data.")
		.addField("Replacing", "Re-enter the portfolio item the same way you did initially to replace it.")
		.addField("Checking", "Get a list of possible portfolios, up to date with what you have already entered, by saying `list`.")
		.addField("Add a portfolio", string);
	return embed;
}

function validate_portfolio(r) {
	let nums = Object.keys(portfolios);
	let args = r.split(" ");
	if(!args.length) return {pass:false, data:"**Missing argument:** There was no input. Try again."};
	if(args.length < 1) return {pass:false, data:"**Missing argument(s):** The input must start with the number, followed by space and then the input. Try again."};
	if(isNaN(args[0])) return {pass:false, data:"**Invalid argument:** The input must start with the number, followed by space and then the input. Try again."};
	if(!nums.includes(args[0])) return {pass:false, data:"**Invalid argument:** The input number at the start must be in the list. Try again, or write `list` to see all possible ones."};
	
	let num = args.shift();
	args = args.join(" ");

	let rg = {
		site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
		fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
		username: new RegExp(/[a-zA-Z0-9-_.]/, "ig")
	};
	switch (parseInt(num)) {
	case 1:
		// Type: site
		if(!rg.site.test(args)) return {pass:false, data:"**Invalid argument:** The input after the number did not match that of a valid website URL. Try again."};
		else return {pass:true, data:args, type:num};
	case 8:
		// Type: facebook
		if(!rg.fb.test(args)) return {pass:false, data:"**Invalid argument:** The input after the number did not match that of a valid Facebook URL. Try again."};
		else return {pass:true, data:args, type:num};
	default:
		// All other is of type username
		if(!rg.site.test(args)) return {pass:false, data:"**Invalid argument:** This portfolio item accepts only a username, not URL. See the corresponding 'Reply with' from the list by typing `list`, and try again."};
		args = args.replace("@","");
		if(!rg.username.test(args)) return {pass:false, data:"**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again."};
		else return {pass:true, data:args, type:num};
	}

}
/****************************************
 *	CATCH X BLOCKS
 * **************************************/
async function catch_isType(msg, doc, meta, r) {
	if(isNaN(r)) return send(msg, doc, response.not_valid_num, meta, catch_isType);
	meta.type = parseInt(r);
	//TODO: Incorporate list generated from config.market.creator_types
	if(meta.type>=4) {
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
		meta.type = 5;
		return give_info(msg, doc, meta, null);
	}

	r = noFormatting(r);
	if(r.length<=1) return send(msg, doc, response.tooShort, meta, catch_customerCompany);
	if(r.length>60) return send(msg, doc, response.tooLong, meta, catch_customerCompany);
	meta.portfolios = null;
	meta.tags = null;
	meta.company = r;
	return give_info(msg, doc, meta, null);
}

async function catch_comissionsOpen(msg, doc, meta, r) {
	meta.company = null;
	// Yes or no
	if(r.toLowerCase()==="no") {
		// Nope
		meta.open = false;
		return send(msg, doc, response.askTagsAnyway, meta, ask_tags);
	} else if(r.toLowerCase()==="yes") {
		// Yep
		meta.open = false;
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
		let max = types[meta.type.toString()].max_tags;
		let tags = r.split(/,|, +/);
		let invalidOnes = tags.filter(t => !types[meta.type.toString()].tags.includes(t.toLowerCase()));
		let validOnes = tags.filter(t => types[meta.type.toString()].tags.includes(t.toLowerCase()));
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
				response = "There was some invalid tags in there:\n" + invalidOnes.join(", ");

				if (validOnes.length > nLeft) response += `\nFurthermore, you gave too many valid tags. Max is **${max}**, which means you had **${validOnes.length-nLeft} too many** *(excluding the invalid ones)*.  Replying with a new list will entirely replace the current.`;
				else if (validOnes.length===nLeft) response += "\nDisregarding the invalid ones, you have now exactly maxed out your tags list.\nReplying with a new list will entirely replace this one.";
				else response += `As a result, you still have **${nLeft-validOnes.length} tags left**. Reply with more tags to fill out the list.`;
				
				response += `\nHere's you current list of tags:\n${validOnes.join(", ")}`;
				response += "**To move on, write `next`.**";
			} else {
				// Had no invalid tags
				if (validOnes.length > nLeft) response = `You gave too many tags. Max is **${max}**, which means you had **${validOnes.length-nLeft} too many**. Replying with a new list will entirely replace the current.`;
				else if (validOnes.length === nLeft) response = `Great, you've used all your tags slots. Tags can be changed later too, using the \`${doc.prefix}profile tags\` command. Replying with a new list will entirely replace the current.`;
				else response = `You have **${max-validOnes.length} tags left** you can use. Reply with more if you want to use more.`;
				
				response += `\nHere's you current list of tags:\n${validOnes.join(", ")}`;
				response += "**To move on, write `next`.**";
			}
		} else {
			//* User is first now coming to this part, or is replacing entire list.
			meta.tags = validOnes.slice(0, max);

			if (invalidOnes.length) {
				// Had invalid tags:
				response = "There was some invalid tags in there:\n"+invalidOnes.join(", ");
				
				if(validOnes.length>max) response += `\nFurthermore, you gave too many valid tags. Max is **${max}**, which means you had **${validOnes.length-max} too many** *(excluding the invalid ones)*.`;
				else if(validOnes.length===max) response += "\nDisregarding the invalid ones, you have now exactly maxed out your tags list.\nReplying with a new list will entirely replace this one.";
				else response += `\nAs a result, you still have **${max-validOnes.length} tags left**. Reply with more tags to fill out the list.`;

				response += `\nHere's you current list of tags:\n${validOnes.join(", ")}`;
				response += "**To move on, write `next`.**";
			} else {
				// Had no invalid tags:
				if (validOnes.length>max) response = `You gave too many tags. Max is **${max}**, which means you had **${validOnes.length-max} too many**. Replying with a new list will entirely replace the current.`;
				else if (validOnes.length === max) response = `Great, you've used all your tags slots. Tags can be changed later too, using the \`${doc.prefix}profile tags\` command. Replying with a new list will entirely replace the current.`;
				else response = `You have **${max-validOnes.length} tags left** you can use. Reply with more if you want to use more.`;
				response += `\nHere's you current list of tags:\n${validOnes.join(", ")}`;
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

	let data = validate_portfolio(r);

	if(!data.pass) return send(msg, doc, data.data, meta, catch_portfolio);
	meta.portfolios = {...meta.portfolios, [data.type.toString()]:data.data};
	return send(msg, doc, `Portfolio item **${portfolios[data.type.toString()].name}** added as: ${data.data}.\n**Reply with…**\n•    a new/existing portfolio item to add/change\n•    \`list\` to view possible ones and up to date list of added\n•    \`done\` to finish registration.`);
}

async function give_info(msg, doc, meta) {
	// End of registration. Give general info.
	//TODO: Add saving of 'meta' somewhere.
	// Recap:
	return msg.author.send("**Registration complete!**\n"+JSON.stringify(meta));
}