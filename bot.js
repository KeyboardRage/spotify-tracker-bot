const dotenv = require("dotenv");
dotenv.config();
const config = require("./data/config.json");
const Discord = require("discord.js");
const Client = new Discord.Client(config.client);
const Sentry = require("./util/extras");
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
	fn.sync_market_users(Client);
});
Client.on("message", async msg => {
	if(msg.author.bot||msg.content.length>500) return;
	// if(msg.guild.me.permissions.bitfield ^ config.DACCESS.VIEW_CHANNEL) return;
	if(await fn.check_ban((msg.channel.type!=="dm")?msg.guild.id:null, msg.author.id)) return;
	let {cmd,args,doc} = await fn.parse_message(msg);
	cmd = await fn.check_alias(Client, cmd);
	if(!cmd) return;
	if(Client.block_all) return fn.blocked_for(msg, config.messages.restart);
	if(!await fn.user_locked(msg, cmd)) return;
	if(msg.channel.type!=="dm" && await fn.disabled(msg.channel.id, cmd, args, doc)) return;
	if(await fn.check_cooldown(msg, cmd)) return;
	if(msg.channel.type==="dm" && !Client.commands[cmd].dm) return msg.channel.send(config.messages.dm_only);
	if(await fn.checkLock(msg.author.id, cmd, msg.channel.type==="dm"?false:msg.guild.id)) return fn.blocked_for(msg, config.messages.user_locked);
	fn.catch_new(msg, cmd, doc);
	// if(msg.channel.type!=="dm" && await fn.check_self_perms(msg, cmd, doc.prefix)) return;

	doc.level = await Client.commands[cmd].permission(msg, doc);
	if(process.env.DEBUG==="true") console.log(doc.level);

	if(!doc.level.grant) return msg.channel.send(config.messages.no_permission);
	fn.add_cooldown(msg, cmd);
	// Configure sentry to contain extra metadata in potential errors:
	Sentry.configureScope(scope=>{
		scope.setUser({id:msg.author.id, username:msg.author.username});
		scope.setTags({guild:msg.channel.type==="dm"?"DM":msg.guild.id, guildName:msg.channel.type==="dm"?"DM":msg.guild.name, command: cmd, args:JSON.stringify(args)});
	});
	if(args[0]==="?") return Client.commands[cmd].help(msg, cmd, args, doc);
	else return Client.commands[cmd].exec(msg, cmd, args, doc);
});
Client.on("guildCreate", guild => {
	fn.add_guild(guild, Client);
	fn.sync_market_users_for_guild(guild);
});
Client.on("guildDelete", guild => {
	fn.remove_guild(guild);
});
Client.on("roleDelete", role => {
	fn.remove_role(role);
});
Client.on("guildMemberRemove", member => {
	fn.remove_member(member);
	fn.update_market_users(0, member);
});
Client.on("guildMemberAdd", member => {
	fn.new_member(member);
	fn.update_market_users(1, member);
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