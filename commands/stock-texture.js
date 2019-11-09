const request = require("request"),
	fn = require("../util/response_functions"),
	fs = require("fs"),
	path = require("path"),
	cache_path = path.join(require.main.filename, "../../../bucket-storage/cache/"),
	{emotes} = require("../util/command-utilities");
const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");

module.exports = {
	cmd: "texture",
	aliases: ["txt", "textures"],
	cooldown: {min: 8},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: [""],
	desc: "Search textures on Pexels by keyword(s).",
	async exec(msg, cmd, args) {
		
		if(args.length === 0) {
			return msg.channel.send("**Missing argument:** You must give me keyword(s) to search for!");
		}
		let validArgs = Array();
		args.forEach(arg => {
			arg = arg.replace(/[^a-zA-Z0-9-]/g,"");
			if(arg.length) validArgs.push(arg);
		});
		if (!validArgs.length) return msg.channel.send("**Missing argument:** There was nothing left of your search string after removing invalid characters.");

		// Initialize reused data
		let reuseData = {
			author: msg.author,
			imgno: 0,
			args: validArgs
		}
		msg.channel.startTyping();
		// Sets Data and Available and pass entire reuseData
		reuseData = await getImage(reuseData)
		.catch(e => {
			console.log(e);
			msg.channel.stopTyping();
			msg.channel.send("Couldn't handle your request at this time. Try again later.");
			console.error(e);
			fn.notifyErr(msg.client, e);
			return;
		});

		// Request was had no errors, but also no success, e.g. no images found.
		if (reuseData.hasOwnProperty("success") && reuseData.success === false) {
			msg.channel.stopTyping();
			return msg.channel.send(reuseData.msg);
		}

		// Init by embedding and adding emotes.
		let embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setFooter(`${msg.author.tag} • Showing image 1 of ${reuseData.data.length}`, msg.author.avatarURL)
			.setColor(process.env.THEME)
			.addField("Result", `Photo by [${reuseData.data[0].user}](${reuseData.data[0].profile.replace(" ","%20")}) from [${reuseData.data[0].sitename}](${reuseData.data[0].url})\n[Download](${reuseData.data[0].download})`) // On the first embed, get only first result anyway.
			.setImage(reuseData.data[0].image);

		// Send embed, then add emotes.
		msg.channel.stopTyping();
		msg.channel.send(embed)
			.then(async message => {
				// Adds emotes.
				reuseData.emotes = await emotes(msg.client, message, ["588844523204116501", "588844523832999936", "588844515461300448", "588844523128487936"]);
				return createListener(reuseData, message, Discord);
			})
			.catch(e => {
				console.error(e);
				fn.notifyErr(msg.client, e);
				msg.channel.stopTyping();
				return msg.channel.send("Could not process your request ATM. Try again later.");
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
			.addField("Usage", `\`${doc.prefix}${this.cmd} <search term(s)>\``)
			.addField("Reactions", "Use reactions for navigation and removing the embed.\n<:Previous:588844523204116501> Previous image. <:Next:588844523128487936> Next image\n<:Ellipsis:588844515461300448> Go to page #. <:Stop:588844523832999936> Removes the embed.")
			.addField("Examples", `\`${doc.prefix}${this.cmd} marble\`\n\`${doc.prefix}${this.cmd} burnished wood\`\n\`${doc.prefix}${this.cmd} gravel\``)
		return msg.channel.send(embed);
	}
};

/**
 * Edits an embedded message
 * @param {Object} message The existing embedded message with reactions
 */
async function editEmbed(reuseData, message, Discord, action) {

	//TODO: Make cache expiration in backend.
	let newEmbed = new Discord.RichEmbed(message.embeds[0])
		.setImage(reuseData.data[reuseData.imgno].image)
		.setFooter(`${reuseData.author.tag} • Showing image ${reuseData.imgno+1} of ${reuseData.available}`, reuseData.author.avatarURL); //TODO: Some anomaly here. What if not that many images? Use array length instead.
	newEmbed.fields[0].value = `Photo by [${reuseData.data[reuseData.imgno].user}](${reuseData.data[reuseData.imgno].profile.replace(" ","%20")}) from [${reuseData.data[reuseData.imgno].sitename}](${reuseData.data[reuseData.imgno].url})\n[Download](${reuseData.data[reuseData.imgno].download})`;
	message.edit(newEmbed)
	.then(message => {
		return createListener(reuseData, message, Discord);
	})
	.catch(e => {
		throw e; // Unknown error.
	});
}

/**
 * Removes the user's added emote, to avoid having to un-react and rect to register new.
 * @param {Object} reuseData The re-useable data. Need the Author element in it.
 * @param {Object} reaction The actual reaction itself. It contains data on message etc.
 */
async function removeUserReaction(reuseData, reaction) {
	// Doesn't work idk why
	reaction.remove(reuseData.author);
}
/**
 * Determines what to do when a reaction is collected.
 * @param {String} action The name of the emote used actually
 */
async function actionListener(reuseData, action, message, Discord) {
	switch(action) {
		case "Next":
			reuseData.imgno = await imageNumber(reuseData, "inc");
			editEmbed(reuseData, message, Discord);
			break;
		case "Previous":
			reuseData.imgno = await imageNumber(reuseData, "dec");
			editEmbed(reuseData, message, Discord);
			break;
		case "Stop":
			message.delete();
			break;
		case "Ellipsis":
			awaitNumberMessage(reuseData, message, Discord);
			break;
	}
}

/**
 * Makes bot wait for a number reply from the author.
 * @param {Object} reuseData Required main data.
 * @param {Object} message The message with the embed
 * @param {Object} Discord Required for passing back an reaction listener.
 * @returns {Promise} Waits for reply, then checks, then pass back result or new listener.
 */
async function awaitNumberMessage(reuseData, message, Discord) {
	const filter = msg => msg.author.id === reuseData.author.id;
	let question = Object();
	message.channel.send("Which image number do you want to go to?")
	.then(msg => {
		question = msg;
	});

	message.channel.awaitMessages(filter, {max:1, time:15000, errors:["time"]})
		.then(collected =>{
			let imageNumber = collected.first().cleanContent;

			// Is a number:
			try {
				imageNumber = parseInt(imageNumber);
				imageNumber--; // Taking 0-index in to account.
			} catch {
				return question.edit("That's not a valid number.");
			}

			// Number too high/low:
			if(imageNumber < 0 || imageNumber > reuseData.available) {
				question.edit(`Not within any valid range. Choose between 1 and ${reuseData.available}. Try again with new reaction.`);
				createListener(reuseData, message, Discord);
				return;
			}

			question.delete();
			// Now go to that image number.
			reuseData.imgno = imageNumber;
			editEmbed(reuseData, message, Discord);
		})
		.catch(e => {
			// Time ran out. Idk what to do here.
			question.delete();
			message.clearReactions();
			console.error(e);
			return;
		});
}

/**
 * Increase/decrease image number, looping at 100 and 1.
 * @param {String} dec If you want to decrease.
 * @returns {Number} Image number to view.
 */
function imageNumber(reuseData, action) {
	return new Promise(resolve => {
		let number = (action === "dec") ? reuseData.imgno-1 : reuseData.imgno+1;
		
		// Do a loopy
		if (number === reuseData.available) number = 0;
		else if (number === -1) number = reuseData.available - 1;
		
		return resolve(number);
	});
}

/**
 * Creates a new listener on the message.
 * @param {Array} usedEmotes The emotes used orignally.
 * @param {Object} message The message with embed that has the emotes.
 */
async function createListener(reuseData, message, Discord) {
	// Get only reactions from author that is one of ours.
	let filter = (reaction, user) => reuseData.emotes.includes(reaction.emoji.id) && reuseData.author.id === user.id;
	message.awaitReactions(filter, {
		time: 20000,
		max: 1,
		errors: ["time"]
	}).then(collected => {
		// Collected emote
		removeUserReaction(reuseData, collected.first());
		return actionListener(reuseData, collected.first().emoji.name, message, Discord);
	})
	.catch(e => {
		console.error(e);
		console.log("Time ran out.");
		return message.clearReactions();
	});
}

/**
 * Takes care of getting data.
 * @param {Array} args Original arguments.
 * @returns {Object} All data.
 */
async function getImage(reuseData) {
	return new Promise((resolve,reject) => {
		tryCache_v2(reuseData.args)
		.then(data => {
			reuseData.available = data.length;
			reuseData.data = data;
			return resolve(reuseData);
		})
		.catch(e => {
			console.error(e);
			tryApi(reuseData.args)
				.then(data => {
					// Request was had no errors, but also no success, e.g. no images found.
					if(data.hasOwnProperty("success") && data.success === false) return resolve(data);

					reuseData.available = data.length;
					reuseData.data = data;
					return resolve(reuseData);
				})
				.catch(e => {
					console.error(e);
					return reject(e);
				});
		});
	});
}

function tryCache_v2(keyword) {
	return new Promise((resolve, reject) => {
		let filepath = path.join(cache_path, "/", keyword.join("_")+".json");

		fs.readdir(cache_path, (err, files) => {
			if (err) return reject(err);
			if (files.includes(keyword.join("_") + ".json")) {
				let data = require(filepath);
				return resolve(data);
			} else {
				return reject({
					err: false,
					success: false,
					msg: "No file in cache."
				});
			}
		});
	});
}
function tryApi(args) {
	return new Promise((resolve, reject) => {
		request.get(process.env.NEW_API+"/v1/stock-texture?keyword=" + args.join(" "), (err, res) => {
			if (err) return reject(err);
			try {
				if (res.statusCode === 200) return resolve(JSON.parse(res.body).data);
				else return reject(res.statusCode, res.body);
			} catch (e) {
				return reject(e);
			}
		});
	});
}