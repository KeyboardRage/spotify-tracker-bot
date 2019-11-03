//===============================================
// 	 Anything Mongo database related pre-requisites.
//===============================================

//TODO: Look in to using different replicas for read and write. Write to main, read to secondary, analytics on third.

const mongoose = require("mongoose"),
	Secrets = require("../hidden/secrets.json");	
const chalk = require("chalk");
/**
 * Create main DB instance
 */
//TODO: Also list replica's and other strategies
let maindb = mongoose.createConnection(process.env.DB_URI, {
	useNewUrlParser: true,
	useFindAndModify: false,
	useUnifiedTopology: true
}, err => {
	if (err) {
		maindb.removeAllListeners();
		console.error(chalk.black.bgRed(" × ") + " Could not connect to MongoDB:", err);
		throw err;
	} else {
		console.info(chalk.black.bgGreen(" ✓ ") + " Connected MongoDB.");
	}
});
maindb.on("close", () => {
	maindb.removeAllListeners();
});
module.exports.maindb = maindb;

//?======= SCHEMAS & MODELS ==========
// Permissions schema
let botPermsSchema = new mongoose.Schema({
	_id:String,
	inherit: Number,
	bot_ban: Number,
	guild_ban: Number,
	user: Number,
	permium: Number,
	community: Number,
	mod: Number,
	admin: Number,
	dev: Number,
	owner: Number
}, {collection:"counters"});
let botPerms = maindb.model("botPerms", botPermsSchema);
module.exports.botPerms = botPerms;

// User permission sub-document
const permSubSchema = new mongoose.Schema({
	"_id":String,
	"permission":Number,
	"reason":String
});
// Define permissions schema and model.
const permsSchema = new mongoose.Schema({
	"_id": String, // ONE document will be "_id":"global" for global vars. Else GuildID
	"users": [permSubSchema] // Each user has a sub-doc
}, {collection:"permissions"});
const permsModel = maindb.model("permsModel", permsSchema);
module.exports.permsModel = permsModel;

// Guild blacklist (guild bans)
const guildBansSchema = new mongoose.Schema({
	"_id":String,
	"reason": String,
	"owner": String,
	"date": Date,
	"by": String,
}, {collection: "guildBlacklist"});
const guildBans = maindb.model("guildBans", guildBansSchema);
module.exports.guildBans = guildBans;

// Access: Inrequent. Type: Global bans.
let globalBansSchema = new mongoose.Schema({
	"_id": String,
	"type": String,
	"global": Boolean,
	"reason": String,
	"date": Date,
	"until": Date,
	"by": String
}, {collection:Secrets.db.bansCollection});
let globalBans = maindb.model("globalBans", globalBansSchema);
module.exports.globalBans = globalBans;


// Access: Frequent. Type: Server settings.
let serverSettingsSchema = new mongoose.Schema({
	"_id": String,
	"prefix": String,
	"premium": Boolean,
	"completedSetup":Boolean,
	"permission": Object,
	"moderator": Object,
	"enabledChannels": mongoose.SchemaTypes.Mixed,
	"enabledCommands": mongoose.SchemaTypes.Mixed
}, {collection: "serverSettings", typeKey: "$type"});
let serverSettings = maindb.model("serverSettings", serverSettingsSchema);
module.exports.serverSettings = serverSettings;

let counterSchema = new mongoose.Schema({
	_id:String,
	sequenceValue: Number
}, {collection:"counters"});
let counterModel = maindb.model("counterModel", counterSchema);
module.exports.counterModel = counterModel;

let feedbackSchema = new mongoose.Schema({
	_id: Number,
	feedbackType: String,
	msg: String,
	user: String,
	when: Date
}, {collection:"feedback"});
let feedbackModel = maindb.model("feedbackModel", feedbackSchema);
module.exports.feedbackModel = feedbackModel;

// Collection for keeping usage statistics
let serverStatisticsSchema = new mongoose.Schema({
	"_id": String,
	"name": String,
	"commandStats": mongoose.SchemaTypes.Mixed,
	"members": Number,
	"bots": Number,
	"cmdsUsed": Number,
	"botAdded": Date,
	"botRemoved": Date
}, {
	collection: "serverStatistics"
});
let statisticsModel = maindb.model("statisticsModel", serverStatisticsSchema);
module.exports.statisticsModel = statisticsModel;

// Forms: sub-document; field
let formFieldSchema = new mongoose.Schema({
	"question": String,
	"order": Number,
	"filter": Number,
	"fitlerValue": String
});
module.exports.formFieldSchema = formFieldSchema;
// Forms: form container
let formSchema = new mongoose.Schema({
	"serverId": String,
	"fields": [formFieldSchema],
	"channel": String,
	"flags": Number,
	"template": String,
	"name": String
}, {collection: "forms"});
let formModel = maindb.model("formModel", formSchema);
module.exports.formModel = formModel;


// Template library
let templateSchema = new mongoose.Schema({
	"name": String,
	"keywords": Array,
	"version": String,
	"updateToken": String,
	"credits": String,
	"downloads": Number,
	"files": {
		"png": String,
		"psd": String,
		"jpg": String,
		"ai": String,
		"svg": String,
		"eps": String
	}
}, {collection: "templates"});
let templateModel = maindb.model("templateModel", templateSchema);
module.exports.templateModel = templateModel;

// Logo library
let logoSchema = new mongoose.Schema({
	"name": String,
	"keywords": Array,
	"version": String,
	"updateToken": String,
	"downloads": Number,
	"files": {
		"png": String,
		"ai": String,
		"svg": String,
		"eps": String
	}
}, {collection: "logos"});
let logoModel = maindb.model("logoModel", logoSchema);
module.exports.logoModel = logoModel;

// Order tempalte: files sub-schema
let filesSubSchema = new mongoose.Schema({
	"label": String,
	"url": String,
	"date": Date,
	"size": String,
	"meta": Number
});

// Order template: master
let orderSchema = new mongoose.Schema({
	"seller": String,
	"buyer": String,
	"sum": Number,
	"status": Number,
	"brief": String,
	"guild": String,
	"files": [filesSubSchema], // Array of Sub-schemas
	"timestamps": Array // Mixed fornow. Logs particulr events for "timeline".
}, {collection: "orders"});
let orderModel = maindb.model("orderModel", orderSchema);
module.exports.orderModel = orderModel;

// Order template: buyer/seller Reports sub-schema
let reviewsScema = new mongoose.Schema({
	"source": String,
	"target": String,
	"guild": String,
	"message":String,
	"rating": Number,
	"date": Date
});

// Order template: buyer/seller
let marketUserSchema = new mongoose.Schema({
	"_id": String, // User Discord ID
	"meta": {
		"discord": String,
		"discriminator": String,
		"available": Boolean,
		"title": String,
		"tags": Array,
		"main_type": Number,
		"company": String,
		"company_url": String
	},
	"portfolios": mongoose.SchemaTypes.Mixed,
	"name": String,
	"purchases": Number,
	"sales": Number,
	"reviews": [reviewsScema],
	"open": Array,
	"email": String,
	"flags": Number, // Random boolean info?
	"last_updated": Date
}, {collection: "marketUsers"});
let marketUserModel = maindb.model("marketUserModel", marketUserSchema);
module.exports.marketUserModel = marketUserModel;

let userTagsSchema = new mongoose.Schema({
	"_id": String,
	"tags": Array,
	"guilds": Array
}, {collection:"userTags"});
let userTags = maindb.model("userTags", userTagsSchema);
module.exports.userTags = userTags;