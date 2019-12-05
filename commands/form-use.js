const {formModel} = require("../util/database"),
	m = require("mustache"),
	{RedisDB} = require("../util/redis"),
	Discord = require("discord.js"),
	Entities = require("html-entities").XmlEntities;
const ACCESS = require("../data/permissions.json");
const fn = require("../util/response_functions");
const {del_session,set_session} = require("../util/session");
let decoder = new Entities();

module.exports = {
	cmd: "f",
	aliases: ["form-use","use-form"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm: false,
	desc: "[<:Grafik:588847763341705263> Premium] Use a form by name.",
	async exec(msg, cmd, args, doc) {
		if (args[0] === "demo") return msg.channel.send("https://youtu.be/mzX8Eh3cd5Y");
		if (!doc.premium) {
			return msg.channel.send("<:Grafik:588847763341705263> **Premium needed** <:Grafik:588847763341705263>\
			\nThis command is part of the form command, one normal users issue to use a form.\
			\nIt is a Grafik Premium feature, and costs $2 a month — however is currently not yet available for public.\
			\nFor a demo video of this command, use `"+doc.prefix+"form demo`.");
		}
		if (args[0] === undefined) return msg.channel.send("<:Stop:588844523832999936> **Missing argument:** You need to specify a form to use! To list all forms, use `"+doc.prefix+"f --list`.");
		
		// List all forms
		if(args[0]==="--list") {
			formModel.find({_id:msg.guild.id}, ["name","fields"], (err,docs) => {
				if(err) return handleErr(err, msg);
				if (docs.length === 0) return msg.channel.send("<:Info:588844523052859392> This guild has no forms.");
				else {
					let response = "📑 **List of forms:**";
					docs.forEach(doc => response += `\n• ${doc.name} — ${doc.fields.length} question${(doc.fields.length===1)?"":"s"}`);
					return msg.channel.send(response);
				}
			});
			return;
		}

		// Get one form
		formModel.findOne({guild:msg.guild.id, name:args[0]}, async (err,formDoc) => {
			if(err) return handleErr(err, msg);
			if (!formDoc) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** There's no such form as `" + args[0] + "`.");
			if (formDoc.template === null) return msg.channel.send("<:Info:588844523052859392> **Cannot run command:** This form does not have an output template.");
			if (!formDoc.fields || formDoc.fields.length === 0) return msg.channel.send("<:Info:588844523052859392> **Cannot run command:** There are no questions in this form.");
			if (await findChannel(msg, formDoc.output_channel) === null) return msg.channel.send("<:Info:588844523052859392> **Cannot run command:** The output channel does not exist.");

			let meta = {step:0, errorStack:0};
			set_session(msg.author.id, "f");
			return loop(msg, formDoc, formDoc.fields[meta.step].question, meta);
		});
	
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <form name>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} request\`\n\`${doc.prefix}${this.cmd} staff-application\`\n\`${doc.prefix}form-use myform\`\n\`${doc.prefix}use-form request\``);
		msg.channel.send(embed);
	}
};

function formatResponse(msg, doc, reply) {

	let completeValues = {
		username: msg.author.username,
		avatar: msg.author.avatarURL.split("?").shift(),
		avatar_hash: msg.author.avatar,
		tag: msg.author.tag,
		uid: msg.author.id,
		mention: `<@${msg.author.id}>`,
		guild: msg.guild.name,
		guild_id: msg.guild.id,
		form: doc.name,
		bot_avatar: msg.client.user.avatarURL.split("?").shift(),
		bot_name: msg.client.user.username,
		bot_mention: `<@${msg.client.user.id}>`,
		date: new Date()
	};
	//* Other ideas:
	/**
	 * 1. Guild: count, bots, members, created, channels
	 * 2. User: joined date, been here for X time, user's roles, boosting
	 */

	// Add the field responses. Need to be incremented by one:
	for(let key in reply) {
		let _ = parseInt(key)+1;
		completeValues = {...completeValues, [_.toString()]:reply[key]};
	}

	let formResponse;

	try {
		formResponse = m.render(doc.template, completeValues);
		formResponse = decoder.decode(formResponse);
		if(doc.flags===1) formResponse = JSON.parse(formResponse);
	} catch (err) {
		handleErr(err, msg);
		formResponse = `<:Stop:588844523832999936> User with ID \`${msg.author.id}\` submitted a form, but I encountered an error parsing the template! Here's the raw data:\n\n \`\`\`json\n${JSON.stringify(completeValues)}\`\`\``;
	}
	return formResponse;
}

/**
 * Finds a ID channel based on input
 * @param {Object} msg Original message object
 * @param {String} input The input to check
 * @returns {String} Returns channel ID or NULL if not found.
 * @example
 * let ch = await findChannel(msg, args[0]);
 */
async function findChannel(msg, input) {
	// Boolean exist to double-check even if valid.
	function chExist(id) {
		return (msg.guild.channels.find(ch => ch.id === id)) ? true : false;
	}
	if (/^\d{16,30}$/.test(input)) {
		if (chExist(input)) return input;
	}
	if (/^<#\d{16,30}>$/.test(input)) {
		let channel = input.replace(/<|#|>/g, "");
		if (chExist(channel)) return channel;
	}
	input = input.toLowerCase();
	let _ = msg.guild.channels.find(ch => ch.name.toLowerCase() === input);
	if (_ === null) return null;
	else return _.id;
}

async function sendAndAwait(msg, text, collected=false, deleteSelf=false, dm=false) {
	return new Promise((resolve,reject) => {
		let sentMessage;
		msg[(dm)?"author":"channel"].send(text)
			.then(message => {
				sentMessage = message;
				return message.channel.awaitMessages(sender=>(sender.author.id === msg.author.id), {maxMatches: 1,time: 100000, errors:["time"]});
			})
			.then(collected => {
				if (collected) return resolve(collected.first().content);
				else return resolve(collected);
			})
			.catch(err => {
				del_session(msg.author.id, "f");
				if (err.size===0) return reject({timeError:true, message:"<:Stop:588844523832999936> Time ran out.", msg:sentMessage}); // is either 0 or undefined
				else return reject(err);
			});
	});
}

async function handleErr(err, msg, response) {
	del_session(msg.author.id, "f");
	if(err.hasOwnProperty("timeError")) {
		return err.msg.edit(err.message);
	} else {
		if (!response) {
			fn.notifyErr(msg.client, err);
			return msg.channel.send("<:Stop:588844523832999936> An unknown error ocurred. The error has been automatically reported.");
		}
		return msg.channel.send(response);
	}
}

async function loop(msg, doc, response, meta) {
	
	if(meta.run) {
		meta.run=false;
		return runField(msg, doc);
	}

	sendAndAwait(msg, response, false, false, true)
		.then(reply => {
			// Check field's condition being met
			if(!meetCondition(reply, meta, doc)) return loop(msg, doc, "Your message does not meed the requested format/conditions. Try again.", meta, runField);

			// Conditions met, execute:
			return runField(msg, doc, reply, meta);
		})
		.catch(err => {return handleErr(err, msg);});
}

async function runField(msg, doc, reply, meta) {
	if(meta.errorStack === 2) {
		del_session(msg.author.id, "f");
		return msg.channel.send("An error have happened one too many times, aborting. Sorry.");
	}

	//! Add to DB here. Need to discern users as well.
	//! Maximum amount in total too?
	RedisDB.hset("form_" + msg.id, meta.step, reply, async err => {
		if(err) {
			meta.errorStack += 1;
			return loop(msg, doc, "<:Stop:588844523832999936> An internal error occured. Can you try that reply again?", meta);
		}

		//============== END OF FIELDS. STOP. ==================
		
		if (meta.step+1 === doc.fields.length) {
			RedisDB.hgetall("form_" + msg.id, async (err, reply) => {
				if (err) return handleErr(err, msg);
				
				msg.author.send("<:Yes:588844524177195047> Thank you for submitting.")
					.then(async () => {
						let formResponse = await formatResponse(msg, doc, reply);
						RedisDB.del("form_"+msg.id, err =>{
							// eslint-disable-next-line no-console
							if(err) console.error(err);
							try {
								msg.guild.channels.get(doc.output_channel).send(formResponse);
							} catch(e) {
								msg.channel.send("<:Stop:588844523832999936> Output channel was deleted during form submission. Using this channel instead.");
								msg.channel.send(formResponse);
							}
							del_session(msg.author.id, "f");
							return;
						});
					})
					.catch(err=> {return handleErr(err, msg);});
			});
		} else {
			meta.step++;
			return loop(msg, doc, doc.fields[meta.step].question, meta);
		}
	});	
}

//TODO: Make this work.
function meetCondition(reply, meta, doc) {
	return true;
}
