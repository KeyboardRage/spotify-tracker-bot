const dotenv = require("dotenv");
dotenv.config();
const config = require("./data/config.json");
const Discord = require("discord.js");
const Client = new Discord.Client(config.client);
require("./util/extras");
const chalk = require("chalk");
const {masterLoadCommands,masterCacheLoader,masterPermissionsLoader} = require("./util/init");
const fn = require("./util/response_functions");
const {init} = require("./util/stats");
Client.locks = {users: new Set(), cmds: new Set(), cooldowns: new Map()};
masterCacheLoader()
	.then(()=>{
		return masterPermissionsLoader();
	})
	.then(()=>{
		return masterLoadCommands(Client);
	})
	.then(()=>{
		// let x = require("./commands/export/export");
		// x(Client);
	}).catch(err=>{throw err;});
//================================
//	CLIENT EVENTS
//================================
Client.on("ready", () => {
	Client.block_all = false;
	console.info(chalk.black.bgGreen(" ✓ ") + chalk.green(` Logged in as ${Client.user.tag}`));
	init(Client);
});
Client.on("message", async msg => {
	if(msg.author.bot||msg.content.length>500) return;
	// if(msg.guild.me.permissions.bitfield ^ config.DACCESS.VIEW_CHANNEL) return;
	if(await fn.check_ban((msg.channel.type!=="dm")?msg.guild.id:null, msg.author.id)) return;
	let {cmd,args,doc} = await fn.parse_message(msg);
	cmd = await fn.check_alias(Client, cmd);
	if(!cmd) return;
	if(!await fn.user_locked(msg, cmd)) return;
	if(msg.channel.type==="dm" && !Client.commands[cmd].dm) return msg.channel.send(config.messages.dm_only);
	if(msg.channel.type!=="dm" && await fn.disabled(msg.channel.id, cmd, args, doc)) return;
	if(await fn.checkLock(msg.author.id, cmd, msg.channel.type==="dm"?false:msg.guild.id)) return msg.channel.send("**Locked:** You must end and existing session of this command first.");
	fn.catch_new(msg, cmd, doc);
	// if(msg.channel.type!=="dm" && await fn.check_self_perms(msg, cmd, doc.prefix)) return;

	if(Client.block_all) return fn.blocked_for_restart(msg);

	doc.level = await Client.commands[cmd].permission(msg, doc);
	// if(process.env.DEBUG==="true") console.log(doc.level);
	console.log(msg.author.username+": "+doc.level);

	if(!doc.level.grant) return msg.channel.send(config.messages.no_permission);
	if(args[0]==="?") return Client.commands[cmd].help(msg, cmd, args, doc);
	else return Client.commands[cmd].exec(msg, cmd, args, doc);
});
Client.on("guildCreate", guild => {
	fn.add_guild(guild, Client);
});
Client.on("guildDelete", guild => {
	fn.remove_guild(guild);
});
Client.on("roleDelete", role => {
	fn.remove_role(role);
});
Client.on("guildMemberRemove", member => {
	fn.remove_member(member);
});
Client.on("guildMemberAdd", member => {
	fn.new_member(member);
});
Client.on("disconnect", () => {
	fn.reconnect(Client);
});
Client.on("error", err => {
	console.error(chalk.black.bgRed(" ERROR ")+" Client error: ", err);
	console.error(chalk.red("Error number: "), err.Error);
	console.error(chalk.red("Error number: "), err.errno);
});
Client.login(process.env.BOT_TOKEN_ID);
//TODO: Add RAM check: https://github.com/ChristopherBThai/Discord-OwO-Bot/blob/master/parent_methods/ramCheck.js