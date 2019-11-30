const {formModel} = require("../util/database"),
	m = require("mustache"),
	request = require("request"),
	{RedisDB} = require("../util/redis"),
	Discord = require("discord.js"),
	Entities = require("html-entities").XmlEntities;
const ACCESS = require("../data/permissions.json");
const fn = require("../util/response_functions");
let decoder = new Entities();

module.exports = {
	cmd: "form",
	aliases: ["forms"],
	cooldown: {min: 1},
	permissionLevel: ACCESS.mod|ACCESS.admin,
	dm: false,
	daccess: [""],
	desc: "[<:Grafik:588847763341705263> Premium] Create / use a customizable form.",
	async exec(msg, cmd, args, doc) {
		if (args[0] === "demo") return msg.channel.send("https://youtu.be/mzX8Eh3cd5Y");
		if (!doc.premium && !["info", "v"].includes(args[0])) {
			return msg.channel.send("<:Grafik:588847763341705263> **Premium needed** <:Grafik:588847763341705263>\
			\n**This guild does not have any premium features.**\
			\nPremium costs $2 a month, but is currently not yet available for public.\
			\nCommands you can use:\
			\n– `"+doc.prefix+"form demo` for a demo of how it works\
			\n– `"+doc.prefix+"form v [variable]` list variables or test them\
			\n– `"+doc.prefix+"form info` list all commands and what it does");
		}

		if(args.length===0) return this.help(msg, cmd, args, doc);
		switch(args[0]) {
		case "info":
			return info(msg, args);
		case "new":
			return formNew(msg, args); //! Done!
		case "select":
			return formSelect(msg, args); //! Done!
		case "duplicate":
			return formDuplicate(msg, args); //! Done!
		case "delete":
			return formDelete(msg, args); //! Done!
		case "list":
			return formList(msg); //! Done!
		case "edit":
			return formEdit(msg, args, doc); //! Semi-done!
		case "export":
			return formExport(msg, args); //! Done!
		case "import":
			return formImport(msg); //! Done!
		case "+":
			return formAdd(msg, args, doc); //! Semi-done!
		case "-":
			return formRemove(msg, args, doc); //! Done
		case ".":
			return formChange(msg, args, doc); //! Done
		case ",":
			return formShow(msg, args, doc); //! Done!
		case "!":
			return startLoop(msg, args, doc); //! Done	
		case "v":
			return formVars(msg, args); //! Done
		case "planned":
			return msg.channel.send(`***PLANNED FEATURES***\
				\n- **Input validation**\
				\n	└ Define acceptable values, like number, number range, pre-defined list, long text, short text, file, etc..\
				\n- **Re-ordering**\
				\n	└ Ability to easily re-arrange the order of questions in a form.\
				\n- **Time limit**\
				\n	└ Users have a cooldown before they can use the form again, defined per form.\
				\n- **Multi-output**\
				\n	└ Ability to choose up to three channels the output will be posted in.\
				\n- **Stored data**\
				\n	└ All form usage will be stored in database, and can be exported.\
				\n- **Stored data: search**\
				\n	└ Ability to perform some sort of search of submissions. What you can search TBD.\
				\n- **Stored data: edit**\
				\n	└ Enable users to edit any or pre-defined fields of form submission after it's sent.\
				\n\nIf you have other suggestions, please use \`${doc.prefix}suggest <suggestion>\` and explain your suggestion.\
				\n- **Auto-add emotes**\
				\n	└ Automatically append up to 5 emotes on the output message.`);
		case "template":
			return formInfoTemplate(msg, doc); //! Done
		default:
			return;
		}
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Permission", `${(this.permissionLevel===2)?"Normal users":(this.permissionLevel===3)?"Bot Moderator":(this.permissionLevel===4)?"Guild Administrator":"Bot developer"}`)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Notes", `\`form\` and its sub-commands are meant for Admins. Normal users have the \`f\` command to use forms: \`${doc.prefix}f <form name>\` to use a form, and \`${doc.prefix}f --list\` to show list of all forms.`)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <"info"|action>\``)
			.addField("Examples", `\`${doc.prefix}f my-form\` *(command for normal users)*\n\`${doc.prefix}${this.cmd} info\` *(list all commands)*\n\`${doc.prefix}${this.cmd} new my-form\`\n\`${doc.prefix}${this.cmd} +\`\n\`${doc.prefix}${this.cmd} edit channel #requests-channel\``);
		msg.channel.send(embed);
	}
};

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
				if (err.size===0) return reject({timeError:true, message:"<:Stop:588844523832999936> Time ran out.", msg:sentMessage}); // is either 0 or undefined
				else return reject(err);
			});
	});
}


async function handleErr(err, msg, response) {
	if(err.hasOwnProperty("timeError")) {
		return err.msg.edit(err.message);
	} else {
		console.error(err);
		if (!response) {
			fn.notifyErr(msg.client, err);
			return msg.channel.send("<:Stop:588844523832999936> An unknown error ocurred. The error has been automatically reported.");
		}
		return msg.channel.send(response);
	}
}

//*Completed:
async function formNew(msg, args) {
	if (args[1] === undefined) return msg.channel.send("<:Info:588844523052859392> You must give the form a name!");
	if (args[1].length>20) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The form name is too long.");

	formModel.findOne({serverId:msg.guild.id, name:args[1]}, "name", (err,doc) => {
		if (err) return handleErr(err, msg);
		if (doc) return msg.channel.send("<:Stop:588844523832999936> **Conflicting argument:** A form with that name already exists.");

		// Pre-filled content for new form
		let form = new formModel({
			channel: msg.channel.id,
			flags: 0,
			template: null,
			serverId: msg.guild.id,
			name: args[1]
		});
		// Binary map for flags:
		// isJson	1
		// unset 	0
		// unset	0
		// unset	0
		// 0b0001 === 1
	
		// Save the form (insert to DB)
		form.save((err, doc) => {
			if(err) return handleErr(err, msg);
			formRedisSelect(msg.guild.id, doc.id)
			.then(() => {
				return msg.channel.send("<:Yes:588844524177195047> Created and selected new form **" + args[1] + "**.");
			})
			.catch(err => {
				return handleErr(err, msg, "<:Info:588844523052859392> Created form **" + args[1] + "**, but could not select it.");
			});
		}); // Save
	}); // DB q
}

//*Completed:
async function formDelete(msg, args) {
	if(args[1]===undefined) return msg.channel.send("<:Stop:588844523832999936> **Missing argument:** You must give me the name of the form you want to delete.");

	formModel.deleteOne({serverId:msg.guild.id, name:args[1]}, (err,doc) => {
		if(err) return handleErr(err, msg);
		if (doc.deletedCount === 0) return msg.channel.send("<:Info:588844523052859392> Could not find a form with that name.");
		else return msg.channel.send(`<:Yes:588844524177195047> **${args[1]}** deleted.`);
	});
}

//*Completed:
async function formList(msg) {
	formModel.find({serverId:msg.guild.id}, ["name","fields"], (err,docs) => {
		if(err) return handleErr(err, msg);
		if (docs.length === 0) return msg.channel.send("<:Info:588844523052859392> This guild has no forms.");
		else {
			let response = "📑 **List of forms:**";
			docs.forEach(doc => response += `\n• ${doc.name} — ${doc.fields.length} question${(doc.fields.length===1)?"":"s"}`);
			return msg.channel.send(response);
		}
	});
}

//*Completed:
async function formExport(msg, args) {
	if (args[1] === undefined) return msg.channel.send("<:Stop:588844523832999936> **Missing argument:** You must give me the name of the form you want to export.");
	
	formModel.findOne({serverId:msg.guild.id, name:args[1]}, async (err,doc) => {
		if(err) return handleErr(err, msg);
		if (!doc) return msg.channel.send("<:Stop:588844523832999936> Could not find form `" + args[1] + "`.");
		
		doc = doc.toObject();

		let formatted = {
			channel:doc.channel,
			name:doc.name,
			flags:doc.flags,
			template:doc.template,
			fields: await checker.sanitiseFields(doc.fields).catch(err=>{return handleErr(err, msg, err.message);})
		};

		let attachment = new Discord.Attachment(Buffer.from(JSON.stringify(formatted), "utf-8"), `${doc.name}_${msg.guild.id}_${msg.author.id}.json`);
		msg.channel.send(`<:Yes:588844524177195047> Here's the export file for **${doc.name}**:`, attachment);
	});
}

// Import checker functions
let checker = {
	templatePreParse: async function (raw, flags=false) {
		return new Promise((resolve, reject) => {
			if(typeof raw === "string") {
				if(flags===1||flags==="1") {
					try {
						raw = {template:JSON.parse(raw)};
					} catch (_) {
						return reject({
							sanitiserErr: true,
							message: "<:Stop:588844523832999936> **Invalid input:** Pre-parsing of template gave an error. It could be that you are trying to pass an embed/JSON while template type is set to text."
						});
					}
				}
			}
			if(flags) raw.flags = flags;
			if(raw.template===null) return resolve(true);
			let completeValues = {date:Date.now().toString()};
			let parsed = raw.template;
			if(raw.flags===1) {
				try {
					if(typeof parsed!=="object") parsed = JSON.parse(parsed);
					parsed = decoder.decode(parsed);
					parsed = m.render(JSON.stringify(raw.template), completeValues);
				} catch (err) {
					console.error(err);
					return reject({
						sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** Pre-parsing of template gave an error. It could be that \`flags\` should be \`1\`, but is \`0\`, or that template is string and \`flags\` should be \`0\`."
					});
				}
				return resolve(true);
			} else {
				try {
					parsed = decoder.decode(parsed);
					parsed = m.render(parsed, completeValues);
				} catch (err) {
					return reject({
						sanitiserErr:true, message:"<:Stop:588844523832999936> **Invalid input:** The string could not be properly parsed. Check for encapsulation mistakes."
					});
				}
				try {
					parsed = JSON.parse(parsed);
					return reject({sanitiserErr:true,
						message: "<:Stop:588844523832999936> **Invalid input:** The template seem to be of type JSON while the `flag` is set to `0` for string template. Try setting `flags` to `1`."});
				} catch (err) {
					if(typeof(parsed)==="string") return resolve(decoder.decode(raw));
					else return reject({sanitiserErr:true, message:"<:Stop:588844523832999936> **Invalid input:** The template is of unsupported type."});
				}
			}
		});
	},
	checkAllFields: async function(raw) {
		return new Promise((resolve, reject) => {
			if (!raw.hasOwnProperty("channel") || !raw.hasOwnProperty("name") || !raw.hasOwnProperty("flags") || !raw.hasOwnProperty("template") || !raw.hasOwnProperty("fields")) {
				return reject({
					sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** A property is missing from the imported document."
				});
			} else {
				return resolve(true);
			}
		});
	},
	sanitiseFields: async function (fields) {
		return new Promise((resolve, reject) => {
			let sanitizedFields = Array();

			fields.forEach(field => {
				sanitizedFields.push({
					question: field.question,
					filter: field.filter,
					order: field.order
				});
			});

			// Ensure ordering is correct.
			let uniqueSet = new Set();
			// console.log(sanitizedFields);
			for (let i = 0; i < sanitizedFields.length; i++) {
				uniqueSet.add(sanitizedFields[i].order);
			}
			if (uniqueSet.size !== fields.length) return reject({sanitiserErr:true, message:"<:Stop:588844523832999936> **Invalid input:** Form field order values may be duplicated."});
			uniqueSet = Array.from(uniqueSet).sort((a, b) => a - b);

			for (let i = 0; i < uniqueSet.length; i++) {
				if (uniqueSet[i] !== i) return reject({sanitiserErr:true, message:"<:Stop:588844523832999936> **Invalid input:** There may be holes in the sequential number order for the form fields. Starts at `0`."});
			}

			return resolve(sanitizedFields);
		});
	},
	strip: async function(raw) {
		return new Promise(resolve => {
			let stripped = {
				name: raw.name,
				channel: raw.channel,
				template: raw.template,
				flags: raw.flags,
				fields: raw.fields
			};
			raw = stripped;
			return resolve(stripped);
		});
	},
	checkName: async function(raw, textField) {
		return new Promise((resolve, reject) => {
			if(textField) raw = {name:raw};

			if (raw.name.length > 20) raw.name = raw.name.slice(0, 19);
			raw.name = raw.name.replace(/[^a-zA-Z0-9-_]+/gi, "");
			if (raw.name.length === 0) return reject({
				sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** The form ended up not having a name after sanitation. Make sure to only use characters A to Z, 0 to 9, underscore and hyphen."
			});
			return resolve(raw.name.toLowerCase());
		});
	},
	checkChannel: async function(raw, msg) {
		return new Promise(async (resolve, reject) => {
			if (raw.channel.length > 40) raw.channel = raw.channel.slice(0, 49);
			raw.channel = raw.channel.replace(/[^0-9]+/gi, "");
			if (raw.name.length === 0) return reject({
				sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** The form ended up not having a channel ID to check after sanitation. Make sure to only use characters 0 to 9."
			});
			let channel = await findChannel(msg, raw.channel);
			if (channel === null) {
				sendAndAwait(msg, "<:Stop:588844523832999936> **Invalid input:** The given channel does not exist in this guild. **Reply with a channel name, ID, or mention to target:**")
					.then(async r => {
						channel = await findChannel(msg, r);
						if (channel === null) return reject({
							sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** The given channel does not exist in this guild. **Aborting import**."
						});
						raw.channel = channel;
						return resolve(raw.channel);
					})
					.catch(err => {
						return reject(err);
					});
			} else {
				raw.channel = channel;
				return resolve(raw.channel);
			}
		});
	},
	checkFlags: async function(raw) {
		return new Promise((resolve,reject) => {
			let validFlagValues = [0, 1];
			if (raw.flags.length > 10) raw.flags = raw.flags.slice(0, 9);
			raw.flags = raw.flags.toString().replace(/[^0-9]+/gi, "");

			try {
				raw.flags = parseInt(raw.flags);
			} catch (err) {
				return reject({
					sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** Failed to check flag integer value."
				});
			}

			if (!validFlagValues.includes(raw.flags)) return reject({
				sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** The final flag value is not a valid one."
			});

			return resolve(raw.flags);
		});
	},
	checkTemplate: async function(raw) {
		return new Promise((resolve, reject) => {
			let string = String();
			try {
				let _ = JSON.parse(raw.template);
				parsed = m.render(JSON.stringify(raw.template), {
					date: new Date()
				});
				parsed = JSON.parse(parsed);
				_ = JSON.stringify(_);
				parsed = JSON.stringify(parsed);
				string = JSON.stringify(raw.template);
			} catch (err) {
				return reject({
					sanitiserErr:true, message: "<:Stop:588844523832999936> **Invalid input:** The template could not be parsed properly."
				});
			}
			return resolve(string);
		});
	}
};

//*Completed:
async function formImport(msg) {
	if (msg.attachments.array().length === 0) return msg.channel.send("<:Stop:588844523832999936> **Missing input:** You must attach a valid JSON form file to import.");

	request.get(msg.attachments.first().url, {encoding:"utf8"}, async (err, res, body) => {
		if(err) return handleErr(err);
		if(res.statusCode !== 200) return msg.channel.send("Could not read attachment.");
		else {
			try {
				let imported = JSON.parse(body);

				// let formatted = new ImportedForm(imported);
				try {
					await checker.templatePreParse(imported);
					await checker.checkAllFields(imported);
					imported = await checker.strip(imported);
					imported.fields = await checker.sanitiseFields(imported.fields);
					imported.name = await checker.checkName(imported);
					imported.channel = await checker.checkChannel(imported, msg);
					imported.flags = await checker.checkFlags(imported);
					imported.template = await checker.checkTemplate(imported);
				} catch (err) {
					if(err.hasOwnProperty("sanitiserErr")) return msg.channel.send(err.message);
					else return msg.channel.send("<:Stop:588844523832999936> **Invalid input:** The imported document did not pass all the checks.");
				}

				formModel.findOne({serverId:msg.guild.id, name:imported.name}, async (err,doc) => {
					if(err) return handleErr(err, msg);
					if(doc) {
						sendAndAwait(msg, "<:Stop:588844523832999936> **Conflicting input:** A form with this name already exist. Give me a new name for the form to proceed with import:")
							.then(async r => {
								imported.name = await checker.checkName(r, true); //TODO: Do some kind of text validation. No special chars, no space, etc.
								return getDoc(msg.guild.id, imported.name);
							})
							.then(checkedDoc => {
								if (!checkedDoc) return formSaveImport(imported, msg);
								return msg.channel.send("<:Stop:588844523832999936> **Conflicting input:** A form with this name already exist too. **Aborting import**.");
							})
							.catch(err => {return handleErr(err, msg);});
					} else return formSaveImport(imported, msg);
				});
			} catch(e) {
				return msg.channel.send("<:Stop:588844523832999936> **Invalid input:** The imported file contains invalid or missing fields.");
			}
		}
	});
}

/**
 * Saves the final import data to DB
 * @param {Object} form The final sanitised form data
 * @param {Object} msg The original message object
 * @returns {Null} Sends success message or pass on error to handler.
 */
async function formSaveImport(formatted, msg) {
	let imported = new formModel({
		name:formatted.name,
		channel:formatted.channel,
		flags:formatted.flags,
		template:formatted.template,
		serverId:msg.guild.id,
		fields:formatted.fields
	});

	imported.save(err => {
		if(err) return handleErr(err, msg);
		msg.channel.send("<:Yes:588844524177195047> Successfully imported form as **" + formatted.name + "**.");
	});
}

//*Complated:
async function formSelect(msg, args) {
	if(args[1]===undefined) return msg.channel.send("You must give me the name of the form you want to select.");

	formModel.findOne({serverId:msg.guild.id, name:args[1]}, "name", (err,doc) => {
		if(err) return handleErr(err, msg);
		if (!doc) return msg.channel.send("<:Stop:588844523832999936> Could not find a form **" + args[1] + "**.");

		formRedisSelect(msg.guild.id, doc.id)
			.then(() => {
				return msg.channel.send(`<:Yes:588844524177195047> **${args[1]}** selected.`);
			})
			.catch(err => {return handleErr(err,msg);});
	});
}

/**
 * Sets currently selected form in Redis.
 * @param {String} GuildID The ID of the guild as string
 * @param {String} FormID The MongoDB._id of the form
 * @returns {Promise} Reject if error. Resolves with the FormID.
 * @example
 * await formRedisSelect(msg.guild.id, "5d8dfbd8fus89b0g8g6dfs6b3kj")
 * .catch(err => {return handleErr(err, msg)});
 */
async function formRedisSelect(serverId, formId) {
	return new Promise((resolve,reject) => {
		RedisDB.hset("formsSelected", serverId, formId, err => {
			if (err) return reject(err);
			return resolve(formId);
		});
	});
}

//*Semi-completed:
async function formAdd(msg, args, guildDoc) {
	let selected = await getSelected(msg.guild.id).catch(err=>{return handleErr(err, msg);});
	if(selected===null) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);

	// TODO: Handle something for selected doc not existing/been deleted
	// TODO: Do some check here too if the form still exists.
	let question = String(),
		filter = Number();
	sendAndAwait(msg, "**Type out the plaintext question for this field**")
		.then(reply => {
			if(reply.length>499) {
				msg.channel.send("<:Stop:588844523832999936> **Invalid input:** Question is way too long.");
				return false;
			}
			question = reply;
			return true;
			return sendAndAwait(msg, "**FILTERS**\
			\nYou can apply basic filters to decide the type of valid content you're expecting.\
			\nReply with the corresponding to apply a filter to this question:\
			\n:one: **Range** User must pick between a minimum and maximum range of numeric value.\
			\n:two: **Number** Any number is valid, but must be a number of some sort *(floats are also valid)*\
			\n:three: **Length** Decide character length limit, smaller than Discord's 2,000 limit.\
			\n:four: **Replacer** Reply with a number to correspond to set of pre-defined a values, just like you're doing right now\
			\n:five: No filter.");
		})
		.then(reply => {
			if(!reply) return false;
			return filter = 5;
			switch(reply) {
				case "1":
				case "one":
					filter=1;
					//TODO: Make looping for invalid input
					return sendAndAwait(msg, `Send the minimum and maximum numeric value using this format: \`#:#\`, where first is min and second is max.`);
				case "2":
				case "two":
					filter=2;
					return null;
				case "3":
				case "three":
					filter=3;
					//TODO: Make looping for invalid input
					return sendAndAwait(msg, `Send the specificed character limit *(account for spaces as well)* as a number between 1 and 2,000`);
				case "4":
				case "four":
					filter=4;
					return sendAndAwait(msg, `Reply with a plaintext JSON of options.`); // TODO: Make builder
				default:
					fitler=5;
					return null;
			}
		})
		.then(filter => {
			if(!filter) return;
			//TODO: Decide order by getting length of Fields

			RedisDB.hget("formsSelected", msg.guild.id, (err, rdoc) => {
				if (err) throw err;
				formModel.findById(rdoc, (err, doc) => {
					if (err) throw err;
					if (!doc) return msg.channel.send("The selected form no longer exist.");

					doc.fields.push({
						question: question,
						order: doc.fields.length,
						filter: filter
					});

					doc.save(err => {
						if (err) return handleErr(err, msg);
						return msg.channel.send(`<:Yes:588844524177195047> **Question added**.\
						\nRefrence the answer to this question using it's order number.\
						\nOrder number: \`${doc.fields.length}\`, refrence using: \`{{${doc.fields.length}}}\``);
					});
				});
			});
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Completed:
async function formRemove(msg, args, guildDoc) {
	getSelected(msg.guild.id)
		.then(doc => {
			if (!doc) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);

			if (doc.fields.length === 0) return msg.channel.send("<:Info:588844523052859392> There's no fields to delete!");
			let index = (args[1]) ? parseInt(args[1]) - 1 : doc.fields.length - 1;
			if (index > doc.fields.length || 0 > index) return msg.channel.send(`<:Stop:588844523832999936> **Invalid argument:** The given number is not within the valid range of \`1\`–\`${doc.fields.length}\`.`);
			let q = doc.fields[index].question;
			doc.fields[index].remove();

			// Start at deleted index and decrease all numbers. Fixes order.
			for(let i = index;i < doc.fields.length;i++) {
				doc.fields[i].order--;
			}

			doc.save(err => {
				if(err) throw err;
				return msg.channel.send(`<:Yes:588844524177195047> **Deleted:** \`${index+1}\` ${q}`);
			});
		})
		.catch(err => {return handleErr(err, msg);});
}

async function formShow(msg, args, guildDoc) {
	getSelected(msg.guild.id)
		.then(doc => {
			if (!doc) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);

			let response = "**List of questions for selected form:**";
			doc.fields.forEach((field,i) => {
				response += `\n\`${i+1}\`. ${field.question}`;
			});
			return msg.channel.send(response);
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Semi Completed:
async function formEdit(msg, args, guildDoc) {
	if(!args[1]) return msg.channel.send(`<:Stop:588844523832999936> **Missing argument:** I need to know what to edit: \`channel\`, \`template\`, \`type\`, \`name\`, or \`order\`.`);
	
	let selected = await getSelected(msg.guild.id).catch(err=>{return handleErr(err, msg);});
	if(selected===null) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);
	
	switch(args[1]) {
	case "channel":
		return formEditChannel(msg, args.slice(2), guildDoc); //! Done
	case "template":
		return formEditTemplate(msg, args.slice(2), selected); //TODO: DO THIS!
	case "type":
		return formEditType(msg, args); //! Done
	case "name":
		return formEditName(msg, args); //! Done
	case "order":
		return msg.channel.send("Feature not yet done.");
		getSelected(msg.guild.id)
			.then(doc => {
				return formEditOrder(msg, doc);
			})
			.catch(err => {
				return handleErr(err, msg);
			});
	default:
		return msg.channel.send(`<:Stop:588844523832999936> **Invalid argument:** Use one of these: \`channel\`, \`template\`, \`type\`, \`name\`, or \`order\`.`);
	}
}

async function loopBack(msg, reply, meta, cb) {
	sendAndAwait(msg, reply)
		.then(r => {
			meta.step++;
			meta.reply = r.toLowerCase();
			return cb(msg, [], meta);
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Completed:
async function formChange(msg, args, guildDoc) {
	let globDoc,
		stop;
	getSelected(msg.guild.id)
		.then(doc => {
			if (!doc) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);
			globDoc = doc;
			if(doc.fields.length===0) {
				msg.channel.send("<:Info:588844523052859392> There's no fields to delete!");
				return false;
			}
			if(isNaN(args[1]) || parseInt(args[1])>doc.fields.length) {
				msg.channel.send("<:Stop:588844523832999936> **Invalid input:** The second argument must be a number in your list.");
				return false;
			}
			return sendAndAwait(msg, "<:Info:588844523052859392> **Reply with the edited question:**");
		})
		.then(reply=> {
			if(reply===false) return;
			if (reply.length > 499) {
				msg.channel.send("<:Stop:588844523832999936> **Invalid input:** Question is way too long. **Aborted**.");
				return false;
			}

			let index = 0;
			try {
				index = (args[1]) ? parseInt(args[1].replace(/[^0-9]+/g, "")) - 1: globDoc.fields.length - 1;
			} catch (err) {
				return msg.channel.send("<:Stop:588844523832999936> **Invalid input:** The second par");
			}
			
			globDoc.fields[index].question = reply;

			globDoc.save(err => {
				if (err) throw err;
				return msg.channel.send(`<:Yes:588844524177195047> **Updated** to: \`${index+1}\` ${reply}`);
			});
		})
		.catch(err => {
			return handleErr(err, msg);
		});
}

//*Completed:
async function formEditTemplate(msg, args, doc) {
	if(doc.flags===0 && args[2]) {
		doc.content = args.slice(2).join(" ");
		msg.delete();
		save(doc)
			.then(()=>{
				return msg.channel.send("<:Yes:588844524177195047> Output template changed.");
			})
			.catch(err => {return handleErr(err, msg);});
	} else {
		sendAndAwait(msg, `**[${doc.name}: ${(doc.flags===0)?"TEXT":"JSON EMBED"}]** Reply with the new output template:`)
			.then(async r => {
				try {
					await checker.templatePreParse(r, doc.flags);
				} catch(err) {
					if(err.hasOwnProperty("sanetiserErr")) return msg.channel.send(err.message);
					else {
						msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** An error occurred trying to validate the template.");
						return false;
					}
				}
				doc.template = r;

				return save(doc);
			})
			.then(_=>{
				if(!_) return;
				return msg.channel.send("<:Yes:588844524177195047> Output template changed.");
			})
			.catch(err => {return handleErr(err, msg);});
	}
}

//*Completed:
async function formEditChannel(msg, optional, guildDoc) {
	let currentDoc;
	getSelected(msg.guild.id)
		.then(doc => {
			if(!doc) return false;
			currentDoc = doc;
			if (optional === undefined || optional.length === 0) return sendAndAwait(msg, "<:About:588844511103287336> Reply with a channel name, id, or mention to set output to:");
			else return optional;
		})
		.then(async reply => {
			if (!reply) return msg.channel.send(`<:Info:588844523052859392> **Cannot use command:** You must select a form first with \`${guildDoc.prefix}form select <form name>\`.`);
			let channel = await findChannel(msg, (typeof reply==="string")?reply:reply[0]);
			if (channel === null) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** Could not find that channel.");

			currentDoc.channel = channel;
			await save(currentDoc).catch(err => {throw err;});
			return msg.channel.send(`<:Yes:588844524177195047> **Output channel** for **${currentDoc.name}** set to <#${channel}>`);
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Completed:
async function formEditType(msg, args) {
	if (args[2] === undefined) return msg.channel.send("<:Stop:588844523832999936> **Missing argument:** I need to know what to change type to: `embed` or `text`.");

	getSelected(msg.guild.id)
		.then(doc => {
			let flags = 0;
			switch (args[2]) {
			case "json":
			case "1":
			case "embed":
				flags = 1;
				break;
			case "text":
			case "0":
			case "plaintext":
			case "string":
				flags = 0;
				break;
			default:
				msg.channel.send("<:Stop:588844523832999936> **Missing argument:** I need to know what to change flags to: `embed` or `text`.");
				return false;
			}
			if(doc.flags===flags) {
				msg.channel.send(`<:Info:588844523052859392> Content flags already is **${(flags===0)?"text**.":"embed**."}`);
				return false;
			}

			doc.flags = flags;
			return save(doc);
		})
		.then(_=>{
			if (_) return msg.channel.send(`<:Yes:588844524177195047> Content type switched to **${(_.flags===0)?"text**.":"embed**."}`);
			return;
		})
		.catch(err=>{return handleErr(err, msg);});
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

/**
 * Saves the document.
 * @param {Object} MongoDB.Doc A Mongoose doc, not object
 * @returns {Promise} Doc if success, reject if fail
 * @example
 * doc.field = "something";
 * await save(doc).catch(err => {return handleErr(err, msg)});
 */
async function save(doc) {
	return new Promise((resolve, reject) => {
		doc.save((err, doc) => {
			if (err) return reject(err);
			return resolve(doc);
		});
	});
}

async function formEditOrder(msg, doc, r) {
	if(!r) return formEditOrderLoopback(msg, doc);
	if(r === "save" || r==="abort") {
		return msg.channel.send("SAVED or ABORTED"); //TODO
	}

	r = r.replace(/ +/, " ").trim().slice(0, 5).toLowerCase(); // To kill long unneeded lengths to check with regex. 5 is max: 99 99
	if(!/[1-9]{1,2} (u|d|[1-9]{1,2})/.test(r)) {
		let response = {delete:false, msg:"\n\n**Reply with …**\
			\n•    `<#> u` to move question No.# one up\
			\n•    `<#> d` to move question No.# one down\
			\n•    `<#1> <#2>` to switch position of question No.#1 and No.#2\
			\n•    `save` to save the order and stop\
			\n•    `abort` to discard changes and stop"};
		return formEditOrderLoopback(msg, doc, response);
	}
	
	r = r.split(" ");
	r[0] = parseInt(r[0]); // Convert to int for logical order checking
	let l = doc.fields.length;

	if(r[1]==="u") {
		if (r[0] <= 1) return formEditOrderLoopback(msg, doc, {delete:true, msg:"<:Stop:588844523832999936> **Invalid argument:** That question is already at the top."});
		return formEditOrderLoopback(msg, doc, "DONE!");
	} else if (r[1] ==="d") {
		if (r[0] >= l) return formEditOrderLoopback(msg, doc, {delete:true, msg:"<:Stop:588844523832999936> **Invalid argument:** That question is already at the bottom."});
		return formEditOrderLoopback(msg, doc, "DONE!");
	} else {
		r[1] = parseInt(r[1]);
		if (r[1] <= 1) return formEditOrderLoopback(msg, doc, {delete:true, msg:"<:Stop:588844523832999936> **Invalid argument:** That question is already at the top."});
		if (r[1] >= l) return formEditOrderLoopback(msg, doc, {delete:true, msg:"<:Stop:588844523832999936> **Invalid argument:** That question is already at the bottom."});
		if (r[1] === r[1]) return formEditOrderLoopback(msg, doc, {delete:true, msg:"<:Stop:588844523832999936> **Invalid argument:** The question is already in that order."});
		return formEditOrderLoopback(msg, doc, "DONE!");
	}
}

async function formEditOrderLoopback(msg, doc, response) {

	if(!response) {
		response = {msg:String(), delete:false};
		response.msg = "**Questions in order:**";
		
		doc.fields.forEach((field, i) => {
			response.msg += `\n\`${i+1}\`. ${field.question}`;
		});
	
		response.msg += "\n\n**Reply with …**\
				\n•    `<#> u` to move question No.# one up\
				\n•    `<#> d` to move question No.# one down\
				\n•    `<#1> <#2>` to switch position of question No.#1 and No.#2\
				\n•    `save` to save the order";
	}
	let del = (response.delete) ? 3000 : false;
	sendAndAwait(msg, response.msg, true, del)
		.then(r => {
			let reply = r.first().content;
			r.first().delete();
			return formEditOrder(msg, doc, reply);
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Completed:
async function formEditName(msg, optional) {
	let currentDoc;
	getSelected(msg.guild.id)
		.then(doc => {
			currentDoc = doc;
			if (optional[2]===undefined) return sendAndAwait(msg, "<:About:588844511103287336> Reply with a new form name:");
			else return optional[2];
		})
		.then(async reply => {
			formModel.findOne({_id:currentDoc._id, name:reply}, async (err,doc)=>{
				if(err) throw err;
				if (doc) return msg.channel.send("<:Info:588844523052859392> A form with that name already exist.");
				
				let oldName = currentDoc.name;
				currentDoc.name = reply;
				await save(currentDoc).catch(err => {throw err;});
				return msg.channel.send(`<:Yes:588844524177195047> Form name change from ${oldName} to **${reply}**`);
			});
		})
		.catch(err => {return handleErr(err, msg);});
}

//*Completed: (may require updated text only)
async function info(msg) {
	// if(args[1]===undefined) {
	let welcome = "***FORM BUILD***\n\
		\n<:Grafik:588847763341705263> **A Premium feature** <:Grafik:588847763341705263>\n\
		\n**About**: This tool allows you to make forms users will fill in DM, and then the result will be posted in a channel of your choice. The result can be displayed in plaintext, or as an embed if you provide me a proper JSON. The values the user provide are acessible for you to display as you please, as well as a set of other pre-defined variables, like username, UID, current date, and so on.\
		\n***COMMANDS:***\
		\n**Forms:**\
		\n- `form demo` Posts a video demo of this command/feature\
		\n- `form template` Information doc about templates\
		\n- `form new` Creates a new form and selects it\
		\n- `form select <form>` Selects a form by name\
		\n- `form delete <form>` Deletes form by name\
		\n- `form list` Lists all forms, **for staff**. Same as bellow.\
		\n- `f --list` List forms, **for normal users**. Same as above.\
		\n- `form edit [form]` Edit current, or given name, form's specifics\
		\n		└ `form edit type <\"text\"|\"embed\">` Output template type\
		\n		└ `form edit template <input>` Output template\
		\n		└ `form edit channel <channel>` Output channel\
		\n		└ `form edit name <new name>` Renames form\
		\n		└ ~~`form edit order` Opens fields re-ordering~~ *WIP*\
		\n- `form duplicate <form> <new form>` Duplicate one of your forms\
		\n- `form export <form>` Exports the given form\
		\n- `form import` Imports a form from a file attachment\
		\n- `form planned` List of additional planned features for forms\n\
		\n**Current form:**\
		\n- `form v [variable]` Lists all variables, or test a variable\
		\n- `form ! <form>` Use form, **for staff**. Same as bellow.\
		\n- `f <form>` Use form, **for normal users**. Same as above.\
		\n- `form +` Add new question to currently selected form\
		\n- `form - [#]` Remove last, or qestion No.# from the form\
		\n- `form . [#]` Edits last, or question No.# content\
		\n- `form ,` List all questions in the current form\
		";
	return msg.channel.send(welcome);
	// }
}

//*Completed:
async function formDuplicate(msg, args) {
	// form duplicate <form> <new form>
	if(args[1]===args[2]) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The new name of the form cannot be the same as the original, or any other pre-existing ones.");
	if (args[1] === undefined || args[2] === undefined) return msg.channel.send("<:Stop:588844523832999936> **Missing argument(s):** You need to pass me the existing form and the duplicate's names.");
	let source = await getDoc(msg.guild.id, args[1]).catch(err=>{return handleErr(err, msg);});
	let target = await getDoc(msg.guild.id, args[2]).catch(err=>{return handleErr(err, msg);});
	if(source===null) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The form you gave does not exist.");
	if(target!==null) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The duplicate's name is already taken.");

	source = source.toObject(); // Converts to JS Object
	delete source._id; // Un-set to allow for new.
	delete source.__v;
	delete source.name; // For good messure.
	if(source.fields.length!==0) {
		for(let i=0;i<source.fields.length;i++) {
			delete source.fields[i]._id; // Remove the sub-doc ID's too.
		}
	}

	target = new formModel({...source, name:args[2]}); // Spread out content in to new model

	target.save(err => {
		if(err) return handleErr(err, msg);
		return msg.channel.send(`<:Yes:588844524177195047> Successfully duplicated ${args[1]} and saved it as **${args[2]}**.`);
	});
}

/**
 * Gets the selected form's document, or its document ID
 * @param {String} GuildID The guild's ID as string
 * @param {Boolean} FormID Return the form's MongoDB._id if true. Default false.
 * @returns {Promise} Rejects errors. Resolves null if no doc, the Document, or the FormID.
 * @example
 * let activeDoc = await getSelected(msg.guild.id).catch(err=>handleErr(err,msg));
 */
async function getSelected(guildId, bool=false) {
	return new Promise((resolve, reject) => {
		RedisDB.hget("formsSelected", guildId, (err,rdoc) => {
			if(err) return reject(err);
			if(rdoc===null) return resolve(null);
			if(bool) return resolve(rdoc);
			formModel.findById(rdoc, (err,doc) => {
				if(err) return reject(err);
				return resolve(doc);
			});
		});
	});
}


async function startLoop(msg, args, guildDoc) {
	if (args[1] === undefined) return msg.channel.send("<:Info:588844523052859392> **Missing argument:** You must give me a form to run.");

	formModel.findOne({serverId: msg.guild.id, name:args[1]}, async (err,doc) => {
		if (err) return handleErr(err, msg);
		if (!doc) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** That form does not exist.");
		if (doc.template === null) return msg.channel.send(`<:Info:588844523052859392> **Cannot run command:** This form does not have an output template.\
		\n\`${guildDoc.prefix}form info template\` for more information.`);
		if (doc.fields.length === 0) return msg.channel.send(`<:Info:588844523052859392> **Cannot run command:** There's no fields in this form.\
		\n\`${guildDoc.prefix}form info fields\` for more information.`);
		if(await findChannel(msg, doc.channel) === null) return msg.channel.send(`<:Info:588844523052859392> **Cannot run command:** The output channel does not exist.\
		\n\`${guildDoc.prefix}form info channel\` for more information.`);

		let meta = {step:0, errorStack:0};
		return loop(msg, doc, doc.fields[meta.step].question, meta);
	});
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
	if(meta.errorStack === 2) return msg.channel.send("An error have happened one too many times, aborting. Sorry.");

	//! Add to DB here. Need to discern users as well. Also needs to lock usage of other forms for same user.
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
								msg.guild.channels.get(doc.channel).send(formResponse);
							} catch(e) {
								msg.channel.send("<:Stop:588844523832999936> Output channel was deleted during form submission. Using this channel instead.");
								msg.channel.send(formResponse);
							}
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
 * Gets the guild=>form's document.
 * @param {String} GuildID The guild's ID as a string.
 * @param {String} query Form's name, or if bool is ture: the form's MongoDB._id
 * @param {Boolean} findById Optional. Default true. Searches form by MongoDB._id
 * @returns {Promise} Rejects errors. Resolves null if none, or Doc if found.
 * @example
 * let targDoc = await getDoc(msg.guild.id, "myform").catch(err=>{return handleErr(err,msg)});
 */
async function getDoc(guildId, name, bool=false) {
	// bool = findById
	return new Promise((resolve,reject) => {
		if(bool) {
			formModel.findById(name, (err,doc) => {
				if(err) return reject(err);
				if(!doc) return resolve(null);
				return resolve(doc);
			});
		} else {
			formModel.findOne({serverId:guildId, name:name}, (err,doc) => {
				if(err) return reject(err);
				if(!doc) return resolve(null);
				return resolve(doc);
			});
		}
	});
}

async function formVars(msg, args) {
	let response = String();
	var completeValues = Object();
	let selected = await getSelected(msg.guild.id).catch(err=>{return handleErr(err, msg);});

	response = "**Variables:**";
	completeValues = {
		username: {info: "Display the user's username", data:msg.author.username},
		avatar: {info: "Gets the users avatar URL", data:msg.author.avatarURL.split("?").shift()},
		avatar_hash: {info: "Display the users avatar HASH", data:msg.author.avatar},
		tag: {info: "Display Username#0000", data:msg.author.tag},
		uid: {info: "Display the users UID", data:msg.author.id},
		mention: {info: "Mentions the user", data:`<@${msg.author.id}>`},
		guild: {info: "Display the guilds name", data:msg.guild.name},
		guild_id: {info: "Display the guilds ID", data:msg.guild.id},
		bot_avatar: {info: "Gives the bot's avatar URL", data:msg.client.user.avatarURL.split("?").shift()},
		bot_name: {info: "Displays the bot's username", data:msg.client.user.username},
		bot_mention: {info: "Mentions the bot", data:`<@${msg.client.user.id}>`},
		date: {info: "Gets the current time and date", data:new Date()}
	};

	if(selected!==null) {
		selected.fields.forEach(field => {
			let num = field.order+1;
			completeValues = {
				...completeValues,
				[`${num.toString()}`]: {
					info: "User's answer to field No. "+num,
					data: `${(field.question.length>50)?field.question.slice(0,49)+" *(…)* ":field.question}`
				}
			};
		});
		completeValues = {...completeValues, form: {info: "Display the name of the form used",data: selected.name}};
	}

	// Only place that makes the response list
	for(let key in completeValues) {
		response += `\n\`{{${key}}}\` → ${completeValues[key].info}`;
	}

	if(args[1] !== undefined) {
		args[1]=args[1].replace(/{|}/g,"");
		if (!completeValues.hasOwnProperty(args[1])) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** There's no such field.");

		response = `**Info:** ${completeValues[args[1]].info}\
			\n**Output for \`{{${args[1]}}}\`:**`;
		response += "\n"+completeValues[args[1]].data;
		if (selected === null) response += "\n\nTo get variables for the current form, select a form first.";
		return msg.channel.send(response);
	} else {
		if (selected === null) response += "\n\nTo get variables for the current form, select a form first.";
		response += "\n\nUse `form v [variable]` to see the variable output in action.";
		return msg.channel.send(response);
	}
}

async function formInfoTemplate(msg, doc) {
	let response = `***TEMPLATES***\
	\n**What is a template?**\
	\nThe template is the thing users submit to once they reach the end of the form. \
	\nThe template will be posted in the channel you specified. It is up to you to make \
	\nthe template. A template can be a simple string or a Discord rich embed, and you \
	\nhave full control over how the embed/text looks.\
	\n
	\n**Variables**\
	\nThe variables is part of what makes this feature powerful, and it's very easy to \
	\nuse once you understand the concept. A variable looks like {{this}}. It's enclosed \
	\nwithin double curly brackets, and have a name inside. It is merely a placeholder for \
	\ninformation. There's a list of pre-defined variables in addition to the user's answers\
	\nfrom the form available, such as {{username}}, {{date}}, {{avatar}}, and so on.\
	\nUse \`${doc.prefix}form v\` for a list of available variables or try them.\
	\n
	\n**Template types**\
	\nThere's two types of templates: text and embed. New forms default to use plaintext \
	\ntemplates. To change to embed, you **first** have to change the template type with \
	\n\`${doc.prefix}form edit type embed\`. Likewise, have to set the type to text if you want\
	\nto switch to that at some point, with \`${doc.prefix}form edit type text\`.\
	\n
	\n**Template: text**\
	\nA plaintext template is a basic message. Let's look at an example. Say you define \
	\nyour template like this: **{{username}}** said \`{{1}}\` in their first question.\
	\nThe output will be displayed as: **${msg.author.username}** said \`answer one\` in their first question.\
	\nPretty easy, right?\
	\n
	\n**Template: embed**\
	\nYou can make the bot output in a rich embed. Embeds are defined as a JSON string. \
	\nYou can use this site like this to help you build the embed: https://leovoel.github.io/embed-visualizer/\
	\nTaking above template as an example, we'd define a template by simply replying with\
	\nthe raw JSON string for it like this:\n\
	{
		"embed": {
			"field": {
				"name": "Question 1",
				"value": "**{{{username}}** said \`{{1}}\` in their first question."
			}
		}
	}
	and it will output as:`;
	let embed = new Discord.RichEmbed()
		.addField("Question 1", `${msg.author.username} said \`answer one\` in their first question.`);
	msg.channel.send(response, embed);
}