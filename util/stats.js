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
	let stats = {
		guilds: Client.guilds.size,
		shards: 1
	};
	if(stats.guilds) {
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
		fn.notify(Client, "**Daily stats update:**\nGuilds: `"+stats.guilds+"`");
	} else return;
}