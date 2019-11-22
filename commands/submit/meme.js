module.exports = main;
const request = require("request");
const fn = require("../../util/response_functions");
const Discord = require("discord.js");

async function main(msg, data, doc, args) {
	if(!data.url) {
		data.url = await detectUrl(args[0]);
		if(!data.url) return msg.channel.send("**Missing input:** You also need to give an image URL or image attachment.");
	}

	let url = process.env.DEBUG==="true"?"http://localhost:5000/v1":`${process.env.NEW_API}${process.env.API_VERSION}`;
	request.post(`${url}/submit/meme`, {
		form: data,
		headers: {
			"Content-Type":"application/json"
		}
	}, (err,res,body) => {
		// Unforseen errors:
		if(err) return handleErr(err, msg, "**Error:** A generic error occurred trying to submit. Incident logged.");
		try {
			body = JSON.parse(body);
		} catch(err) {
			return handleErr(err, msg, "**Error:** API replied with an unknown response.");
		}

		// Error, either client or internal, but caught in backend:
		if(res.statusCode !== 200) {
			if(body.err) {
				return msg.channel.send("**Could not complete command:** "+body.message);
			}
			console.log(res.statusCode, body);
			return handleErr(new Error(body.data), msg);
		}

		// All went well.
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.setDescription("Logo submission summary")
			.addField("**Information:**", `\n**ID:** ${body.message._id}\n**Contributor:** ${body.message.contributor}`, true)
			.addField("**Source:**", body.message.source?body.message.source:"Unknown.", true)
			.addField("**Tags:**", `${body.message.tags?body.message.tags.join(", "):"NO TAGS."}`, true)
			.addField("**Link:**", `https://grafik-bot.net/memes/${body.message.url}`, true);
		return msg.channel.send(embed);
	});
}



/**
 * data.name = name
 * data.allTags = tags
 * data.source = source
 * data.url = attachment if any
 * data.user = uid
 */
async function detectUrl(string) {
	console.log(string);
	if (/^(http|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?(\.jpg|\.jpeg|\.png|\.webp)/i.test(string)) {
		string = string.split(/[?#]/)[0];
		console.log(string);
		return string;
	} else return null;
}

async function handleErr(err, msg, reply=false) {
	console.error(err);
	reply = reply?reply:"**Error:** A generic error occurred trying to submit. Incident logged.";
	fn.notifyErr(msg.client, err);
	return msg.channel.send(reply);
}