const {templateModel} = require("../util/database"),
	fn = require("../util/response_functions"),
	{sendAndAwait} = require("../util/command-utilities"),
	request = require("request"),
	uuid = require("uuid/v4"),
	path = require("path"),
	url = require('url');
const ACCESS = require("../data/permissions.json");
const Discord = require("discord.js");

module.exports = {
	cmd: "template",
	aliases: ["templates", "templ"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: [""],
	desc: "Template library for various platforms and mediums, available in various formats *(Community driven submissions! Contact <@164736401051484160> to get your stuff added and credited)*.",
	async exec(msg, cmd, args, doc) {
		if(!args[0]) return msg.channel.send("<:Stop:588844523832999936> **Missing argument:** You need to provide a search query.");
		if(args.length>20) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The query word is too long.");

		//*Ideas: 
		/**
		 * 1. Search by contributor
		 * 2. Search by ID
		 */
		if(!args[0].startsWith("--")) return search(msg, args);
		if (msg.author.id !== "164736401051484160") {
			return msg.channel.send("<:Stop:588844523832999936> **Permission denied:** That's reserved for bot developers <:Grafik:588847763341705263>");
		}
		switch(args[0].slice(2)) {
			case "new":
				return newEntry(msg, args.slice(1));
			case "edit":
				return void(0);
			case "delete":
				return void(0);
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
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <search text>\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd} twitter avatar\`\n\`${doc.prefix}${this.cmd} facebook pfp\`\n\`${doc.prefix}${this.cmd} fb business cover\``)
		msg.channel.send(embed);
	}
};

async function handleErr(err, msg, response) {
	if(err.size===0) {
		return err.msg.edit("**Time expired.**");
	} else {
		console.error(err);
		let notified = await fn.notifyErr(msg, err).catch(err=>{return false});
		if (!response) return msg.channel.send(`<:Stop:588844523832999936> An unknown error ocurred. ${(notified)?"The error has been automatically reported.":"The automatic error reporting also failed."}`);
		return msg.channel.send(response);
	}
}

async function search(msg, args) {
	if (args.length > 5) return msg.channel.send("**Invalid argument(s):** Maximum amount of tags for search is five.");
	
	templateModel.find({keywords: {$in:[...args]}}, (err,docs) => {
			if(err) {console.error(err);return handleErr(err, msg);}
			if (!docs.length) return msg.channel.send("<:Info:588844523052859392> No templates found matching `"+args.join("`, `")+"`.");
			else if(docs.length>1) {
				let response = "<:Info:588844523052859392> Multiple matches:";
				for(let i=0;i<docs.length;i++) {
					response += `\n\`${i}\` ${docs[i].name} *(v ${docs[i].version})*`;
					if(i===10) break; //TODO: Do some kind of "there are more results";
				}
				response += "\n\n**Reply with** the corresponding number to get.";
				sendAndAwait(msg, response)
				.then(r => {
					if (isNaN(r)) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** Not a valid number.");
					try {
						r = parseInt(r);
					} catch(err) {
						return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** Not a valid number.");
					}

					let doc = docs[r].toObject();

					response = String();
					if(doc.credits!==null) response += "\nCredits to **"+doc.credits+"** for this file.";
					response += `\n**${doc.name}**:`;
					
					Object.keys(doc.files).forEach(key => {
						response += `\n**${key.toUpperCase()}**: ${doc.files[key]}`;
					});

					if(response.length===0) {
						return handleErr({message:`Template library: Entry ID ${doc.id} did not have any file entries!`}, msg,
						"<:Info:588844523052859392> **No files:** It appeats there was no PSD nor PNG in this entry! This has been reported automatically.");
					} else return msg.channel.send(response);
				})
				.catch(err=>{return handleErr(err, msg)});
			} else {
				let doc = docs[0].toObject();
				let response = "<:Info:588844523052859392> Found one match:";
				if (doc.credits !== null) response += "\nCredits to **" + doc.credits + "** for this file.";
				response += `\n**${doc.name}**:`;

				Object.keys(doc.files).forEach(key => {
					response += `\n**${key.toUpperCase()}**: ${doc.files[key]}`;
				});

				if(response.length===0) {
					return handleErr({message:`Template library: Entry ID ${doc.id} did not have any file entries!`}, msg,
					"<:Info:588844523052859392> **No files:** It appeats there was no PSD nor PNG in this entry! This has been reported automatically.");
				} else return msg.channel.send(response);
			}
		});
}


async function tags(data, username) {
	data = data.split("|");

	data[1] = data[1].split(",");
	for(let i=0;i<data[1].length;i++) {
		data[1][i] = data[1][i].replace(/ +/g, " ").replace(/[^a-zA-Z0-9-_ ]+/g,"").trim();
	}
	let meta = {
		name:data[0].replace(/ +/g, " ").replace(/[^a-zA-Z0-9-_ ]+/g,"").trim(),
		keywords:data[1]
	};
	if(data[2]==="me") meta.credits = username;
	else if(data[2]) meta.credits = data[2].replace(/ +/g, " ").replace(/[^a-zA-Z0-9-_ ]+/g,"").trim();
	else meta.credits = null;
	return meta;
}

async function newEntry(msg, args) {
	let data = await tags(args.join(" "), msg.author.username);
	if (msg.attachments.size === 0) return msg.channel.send("<:Stop:588844523832999936> **Missing data:** You must attach a file as well when creating a new entry.");

	data.updateToken = uuid();
	data.url = msg.attachments.first().url;
	data.filetype = path.extname(url.parse(data.url).pathname).slice(1); // Slice removes dot.
	if(data.filetype==="jpeg") data.filetype = "jpg";
	if (!["png", "psd", "jpg", "ai", "svg", "eps"].includes(data.filetype)) return msg.channel.send("<:Stop:588844523832999936> **Invalid input:** The file type must be PNG, JPG, SVG, AI, or EPS.")
	request({
		method: "POST",
		headers: {
			"Content-Type":"application/json" //TODO: Might require HTTPS, x-encoded, n shit later.
		},
		uri: process.env.NEW_API+"/v1/template?action=new",
		form: data,
	}, (err,res,body) => {
		if (err) return handleErr(err, msg);
		if (res.statusCode !== 200) return handleErr(JSON.parse(body), msg, "<:Info:588844523052859392> **Could not complete command:** The API responded with the wrong status code. Check logs.");

		try {
			body = JSON.parse(body);
		} catch {}

		//TODO: If successfully uploaded (response should say):
		let keywords = (body.message.keywords.length === 1) ? body.message.keywords[0] : body.message.keywords.join("`, `");
		return loop(msg, "<:Yes:588844524177195047> Successfully added entry.\
		\n**Summary:**\
		\nFiletype: `"+data.filetype+"`\
		\nName: `"+body.message.name+"`\
		\nKeywords: `"+keywords+"`\
		\nCredits: `"+body.message.credits+"`\
		\nURL: `"+Object.values(body.message.files)[0]+"`\
		\n\nYou only uploaded one file, would like to add another?\
		\nIf not, type \`no\`.", body.message);
		});
}

async function loop(msg, response, doc) {
	msg.channel.send(response)
		.then(message => {
			return message.channel.awaitMessages(sender => (sender.author.id === msg.author.id), {maxMatches: 1,time: 120000,errors:["time"]});
		})
		.then(r => {
			if (r.first().content === "no") {
				return r.first().react("588844524177195047");
			}

			return addAnotheFile(msg, r, doc)
		})
		.catch(err=> {return handleErr(err, msg)});
}

async function addAnotheFile(msg, r, doc) {
	// console.log(r.first().attachments.size);
	if (r.first().attachments.size === 0) return loop(msg, "<:Stop:588844523832999936> **Missing data:** You must attach a file or say `no`.", doc);
	templateModel.findById(doc._id, (err, remoteDoc) => {
		if (err) return reject(err);
		remoteDoc = remoteDoc.toObject();
		if(!remoteDoc) return msg.channel.send("<:Stop:588844523832999936> The entry for this document no longer exists. **Aborted**.");
		if(doc.updateToken!==remoteDoc.updateToken) return msg.channel.send("<:Stop:588844523832999936> **Invalid argument:** The token used to continue uploading files is no longer valid. **Aborted**.");

		// Remove
		delete doc.files;
		delete doc.filetype;

		// Set
		doc.url = r.first().attachments.first().url;
		doc.filetype = path.extname(url.parse(doc.url).pathname).slice(1); // Slice removes dot.
		if (!["png", "psd", "jpg", "ai", "svg", "eps"].includes(doc.filetype)) return loop(msg, "<:Stop:588844523832999936> **Invalid input:** The file type must be PNG, JPG, SVG, AI, or EPS.", doc)
		if(remoteDoc.files.hasOwnProperty(doc.filetype)) return loop(msg, "<:Info:588844523052859392> **An entry for that filetype already exists.**\nTo replace it, use the replace command, or try again with a different format.", doc);


		if (doc.filetype === "jpeg") doc.filetype = "jpg";

		request({
			method: "POST",
			headers: {
				"Content-Type":"application/json"
			},
			uri: process.env.NEW_API+"/v1/template?action=append", //TODO: Change to grafik
			form: doc
		}, (err,res,body) => {
			if (err) return handleErr(err, msg);
			if (res.statusCode !== 200) return handleErr(JSON.parse(body), msg, "<:Info:588844523052859392> **Could not complete command:** The API responded with the wrong status code. Check logs.");

			try {
				body = JSON.parse(body);
			} catch {}

			return loop(msg, "<:Yes:588844524177195047> Successfully appended entry.\
			\n\nWould like to add another file?\
			\nIf not, type \`no\`.", doc);
		}); // Request
	}); // DB check
}