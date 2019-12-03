const request = require("request");
const fn = require("./response_functions");

//================================
//	KEEP BOT STATS UP TO DATE ON LISTS
//================================
module.exports.init = init;
async function init(Client) {
	if(process.env.BOT_ID==="232224611847241729") {
		setInterval(()=>{
			postStats(Client);
		}, 1000*60*60*24);
	}
}

async function postStats(Client){
	let dbs_uri = `https://top.gg/api/bots/${process.env.BOT_ID}/stats`;
	let dboats_uri = `https://discrod.boats/api/bot/${process.env.BOT_ID}`;
	let botson_uri = `https://bots.ondiscord.xyz/bot-api/bots/${process.env.BOT_ID}/guilds`;
	let dbotsgg_uri = `https://discord.bots.gg/api/v1/bots/${process.env.BOT_ID}/stats`;

	let stats = {
		guilds: Client.guilds.size,
		shards: 1
	};

	if(stats.guilds) {
		// Top.gg (Discord Bot List)
		request.post(dbs_uri, {
			body:JSON.stringify({server_count: stats.guilds}), 
			headers:{
				"Authorization":process.env.DBS_TOKEN,
				"Content-Type":"application/json"
			}
		}, (err,res) => {
			if (err) return fn.notifyErr(Client, err);
			console.log(res.body);
		});

		// Discord boats
		request.post(dboats_uri, {
			body:JSON.stringify({server_count: stats.guilds}), 
			headers:{
				"Authorization":process.env.DBOATS_TOKEN,
				"Content-Type":"application/json"
			}
		}, (err,res) => {
			if (err) return fn.notifyErr(Client, err);
			console.log(res.body);
		});

		// Bots.ondiscord.xyz
		request.post(botson_uri, {
			body:JSON.stringify({guildCount: stats.guilds}), 
			headers:{
				"Authorization":process.env.BOTSON_TOKEN,
				"Content-Type":"application/json"
			}
		}, (err,res) => {
			if (err) return fn.notifyErr(Client, err);
			console.log(res.body);
		});

		// discord.bots.gg
		request.post(dbotsgg_uri, {
			body:JSON.stringify({guildCount: stats.guilds}), 
			headers:{
				"Authorization":process.env.DBOTSGG_TOKEN,
				"Content-Type":"application/json"
			}
		}, (err,res) => {
			if (err) return fn.notifyErr(Client, err);
			console.log(res.body);
		});

		// Guild notification
		fn.notify(Client, "**Daily stats update:**\nGuilds: `"+stats.guilds+"`");
	} else return;
}