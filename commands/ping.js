const request = require("request"),
	fn = require("../util/response_functions"),
	{serverSettings} = require("../util/database"),
	{RedisDB} = require("../util/redis");
const Discord = require("discord.js");
const ACCESS = require("../data/permissions.json");
module.exports = {
	cmd: "ping",
	aliases: ["pong","pings"],
	cooldown: {min: 5},
	permissionLevel: ACCESS.user,
	dm:true,
	daccess: [""],
	desc: "Get various pings for the bot.",
	async exec(msg, cmd, args) {
		msg.channel.startTyping();
		let guildId = (msg.hasOwnProperty("guild"))?msg.guild.id:"123";
		if(args[0] === "--site" && args.length >= 2) {
			let timeStart = Date.now();
			request.get(args[1], (err,res) => {
				if(err) {
					msg.channel.stopTyping();
					msg.channel.send("An error occurred trying to ping the site: ```"+err.message+"```");
					throw err;
				}
				if (res.statusCode !== 200) {
					msg.channel.stopTyping();					
					return msg.channel.send(`Got an error code ${res.statusCode}. Anyway, ping was \`${Date.now()-timeStart} ms\`.`);
				}
				msg.channel.stopTyping();
				return msg.channel.send(`Recieved "pong" in \`${Date.now()-timeStart} ms\`.`);
			});
		}
 
		// // Get ping of API
		// let api = () => new Promise(resolve => {
		// 	let time = {start:Date.now(),end:Number()};
		// 	request.get(process.env.API+"/ping", (err,res) => {
		// 		if(err || res.statusCode !== 200) console.error(err);
		// 		time.end = Date.now(); // Do time anyway.
		// 		return resolve(time);
		// 	});
		// });

		// New API, Google
		let app = () => new Promise(resolve => {
			let time = {start:Date.now(),end:Number()};
			request.get(process.env.NEW_API+"/v1/ping", (err,res) => {
				if(err || res.statusCode !== 200) console.error(err);
				time.end = Date.now(); // Do time anyway.
				return resolve(time);
			});
		});
			
		// Get ping of Database
		let db = () => new Promise(resolve => {
			let time = {start:Date.now(),end:Number()};
			serverSettings.findOne({_id:guildId}, err => {
				if(err) console.error(err);
				time.end = Date.now();
				return resolve(time);
			});
		});

		// Get ping of cache
		let redis = () => new Promise(resolve => {
			let time = {start:Date.now(),end:Number()};
			RedisDB.hget("serverPrefixes", guildId, err => {
				if (err) console.error(err);
				time.end = Date.now();
				return resolve(time);
			});
		});

		// Get ping of client
		let grafik = msg.client.ping;
		Promise.all([api(), app(), db(), redis()])
			.then(results => {
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor(process.env.THEME)
					.setFooter(msg.author.tag, msg.author.avatarURL)
					.addField("Client:", `Avg. ping: \`${Math.round(grafik)} ms\``, true)
					.addField("API:", `API roundtrip: \`${results[1].end - results[1].start} ms\``, true)
					.addField("Database:", `DB Roundtrip: \`${results[2].end - results[2].start} ms\`\n Cache: \`${results[3].end - results[3].start} ms\``, true);
				msg.channel.stopTyping();
				msg.channel.send(embed);
				return {
					api: results[0].end - results[0].start,
					db: results[2].end - results[2].start,
					redis: results[3].end - results[3].start,
					client: grafik
				};
			})
			.then(ping => {
				if(ping.grafik > 500) fn.notifyErr(msg.client, new Error(`${msg.author.tag} used \`ping\` and got a result of **client ping** of \`${ping.grafik} ms\`!`));
				if (ping.db > 30 || ping.redis > 10) fn.notifyErr(msg.client, new Error(`${msg.author.tag} used \`ping\`, **DB/Cache** results are DB: \`${ping.db} ms\`, Cache: \`${ping.redis} ms\`!`));
				if (ping.api > 1000) fn.notifyErr(msg.client, new Error(`${msg.author.tag} used \`ping\` and got **API** ping of \`${ping.api} ms\`!`));
				if (ping.app > 1000) fn.notifyErr(msg.client, new Error(`${msg.author.tag} used \`ping\` and got **New API** ping of \`${ping.app} ms\`!`));
				return;
			})
			.catch(err => {
				msg.channel.stopTyping();
				msg.channel.send("**Error:** Something unexpected happened during the pinging.");
				throw err;
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
			.addField("Usage", `\`${doc.prefix}${this.cmd}\``)
			.addField("Examples", `\`${doc.prefix}${this.cmd}\``);
		msg.channel.send(embed);
	}
};