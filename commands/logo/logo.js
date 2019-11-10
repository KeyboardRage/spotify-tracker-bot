const request = require("request");
const {logoModel} = require("../../util/database");
const fn = require("../../util/response_functions");
const Sentry = require("../../util/extras");
const {sendAndAwait} = require("../../util/command-utilities");
const Discord = require("discord.js");

module.exports = main;
async function main(msg, data, doc) {
	logoModel.findOne({name:data.name}, ["_id","tags"], (err,res) => {
		if(err) return handleErr(err, msg, "**Error:** Something went wrong trying to check for existing identical entires. Aborted, and incident logged.");
		console.log(res);
		if(res) return send(msg, data, doc, ":warning: **Note:** An entry with the name **"+data.name+"** already exist — ID: `"+res._id+"`\nTags: "+res.tags.join(", ")+".\nThe file will not be overwritten, but if an entry already exist, it's unnecessary to create a duplicate.\n**Do you want to proceed? Reply with `yes` or `no`.**", execute);
		return execute(msg, data);
	});
}

async function send(msg, data, doc, response, callback) {
	sendAndAwait(msg, response)
		.then(r => {
			if(r.toLowerCase==="yes") return callback(msg, data, doc, r);
			else if (r.toLowerCase()==="no") return msg.channel.send("**Aborted:** Discarded submission.");
			else return send(msg, data, doc, "**Invalid argument:** `"+r+"` is not a valid response. Reply with `yes` or  `no`.", callback);
		}).catch(err=>{
			if(err.size===0) return msg.channel.send("**Aborted:** Time ran out.");
			return handleErr(err, msg, "**Error:** Something went wrong sending message. Aborted.");
		});
}

async function handleErr(err, msg, reply) {
	if(reply) msg.channel.send(reply);
	else msg.channel.send(err.toString());

	fn.notifyErr(msg.client, err);
	Sentry.captureException(err);
	return;
}

async function execute(msg, data) {
	let url = (process.env.DEBUG === "true") ? "http://localhost:5000/v1/submit/logo" : process.env.NEW_API + "/v1/submit/logo";
	request.post(url, {form:data}, (err,res,body) => {
		if(err) return handleErr(err, msg, "**Could not complete command:** Error contacting backend. Incident has been logged.");
		if(res.statusCode!==200) return handleErr(err, msg, "**Could not complete command:** Backend responded with the wrong status. Incident has been logged.");
		// return;
		let fields = ["tags", "download", "version","_id", "name", "last_updated", "available", "contributors"];
		let _body;
		try {
			_body = JSON.parse(body);
		} catch(err) {
			return msg.channel.send("**Could not complete command:** The backend responded with malformatted response. Incident has been logged.");
		}
		// if(!Object.keys(_body).every(e=>fields.includes(e))) {
		// 	return msg.channel.send("**Could not complete command:** The backend didn't respond with all the necessary fields. Incident has been logged.");
		// }
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setDescription("Logo submission summary")
			.addField("**Information:**", `**Name:** ${_body.name}\n**ID:** ${_body._id}\n**Version:** ${_body.version}\n**Last updated:** ${_body.last_updated}\n**Available:** ${(_body.available)?"Yes.":"No."}`, true)
			.addField("**Tags:**", `${_body.tags.join(", ")}`, true)
			.addField("**Contributors:**", `<@${_body.contributors.join(">, <@")}>`, true)
			.addField("**Downloads:**", `[SVG – Vector](${_body.download.svg}) | [PNG – Bitmap](${_body.download.png})`, true);
		if(_body.notes) embed.addField("**Notes:**", `- ${_body.notes.join("\n- ")}`);

		return msg.channel.send(embed);
	});
}