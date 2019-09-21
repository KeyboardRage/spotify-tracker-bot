const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
// CACHE / DATABASES ==============================================
const {RedisDB} = require("./redis");
const {serverSettings,botPerms,permsModel} = require("./database");
// COMMANDS =======================================================
const commands_loader = require("./load_commands");
// CONFIGURATION VALUES ===========================================
const BAN_MAX = 6; // Highest value for banned users
//===============================================================
//		Command loading, checking, and execution
//===============================================================
module.exports.masterLoadCommands = masterLoadCommands;
async function masterLoadCommands(Client) {
	return new Promise((resolve,reject) => {
		let proms = Array();
		// Load commands in to Client
		proms.push(commands_loader(Client));

		Promise.all(proms)
			.then(()=>{
				return resolve(true);
			})
			.catch(err=>{return reject(err);});
	});
}

//===============================================================
//		Cache functions
//===============================================================
module.exports.masterCacheLoader = masterCacheLoader;
async function masterCacheLoader() {
	return new Promise((resolve,reject) => {
		let allCache = Array();
		// Load prefixes
		allCache.push(cacher_prefixes());

		// Load permissions groups
		allCache.push(cacher_permGroups());

		// Load local and global bans from permissions
		allCache.push(cacher_bans());

		Promise.all(allCache)
			.then(()=>{
				return resolve(true);
			})
			.catch(err=>{
				if(err) {
					console.error(chalk.black.bgRed(" × ") + chalk.red(` ERROR: masterCacheLoader() → `), err);
				}
				return reject(err);
			});
	});
}
// Sub-function: cache - prefixes
async function cacher_prefixes() {
	return new Promise((resolve, reject) => {
		serverSettings.find({}, "prefix", (err, docs) => {
			if (err) return reject(err);
			if (!docs) return reject(new Error(" There was no server settings found!"));

			let data = Array();
			docs.forEach(i => {
				data.push(i._id, i.prefix);
			});

			RedisDB.hmset("prefixes", data, (err, r) => {
				if (err) return reject(err);
				console.info(chalk.black.bgGreen(" ✓ ") + " Prefixes cached. N: " + docs.length);
				return resolve(r);
			});
		});
	});
}
// Sub-function: cache - role groups
async function cacher_permGroups() {
	return new Promise((resolve, reject) => {
		botPerms.findOne({
			_id: "permissions"
		}, (err, doc) => {
			if (err) return reject(err);
			if (!doc) return reject(new Error(" Could not find not find data on permission groups!"));

			doc = doc.toObject();
			let data = Array();

			for (let key in doc) {
				if (key === "_id") continue;
				data.push(key, doc[key]);
			}

			RedisDB.hmset("permissions", data, (err, r) => {
				if (err) return reject(err);
				console.info(chalk.black.bgGreen(" ✓ ")+" Groups cached. N:" + data.length/2);
				return resolve(r);
			});
		});
	});
}
// Sub-function: cache - bans (permissions, getting only the bans)
async function cacher_bans() {
	return new Promise((resolve,reject) => {
		permsModel.aggregate([{$project: {users: { $filter: { input:"$users", as:"user", cond: {$lte: ["$$user.permission", BAN_MAX]}}}}}], (err,docs)=>{
			if (err) return reject(err);
			if (!docs) return reject(new Error(" Could not find not find data on permission groups!"));
			
			let globalBans = Array();
			let localBans = new Map();
			docs.forEach(place => {
				if(place.users) {
					place.users.forEach(user => {
						if(place._id==="global") {
							globalBans.push(user._id);
						} else {
							if(localBans.has(place._id)) {
								let arr = localBans.get(place._id);
								arr = [...arr, user._id];
								localBans.set(place._id, arr);
							} else {
								localBans.set(place._id, [user._id]);
							}
						}
					});
				}
			});
			
			if(globalBans.length!==0) {
				RedisDB.sadd(["global_bans", ...globalBans], (err,res) => {
					if(err) return reject(err);
					console.info(chalk.black.bgGreen(" ✓ ")+ " Global bans cached. N:" + globalBans.length);
					return resolve(res);
				});
			}
			if(localBans.length!==0) {
				localBans.forEach((bans,server) => {
					RedisDB.sadd([`bans:${server}`, ...bans], (err, res) => {
						if(err) return reject(err);
						return resolve(res);
					});
					console.info(chalk.black.bgGreen(" ✓ ") + " Local bans cached.");
				});
			}
		});
	});
	//*Query aggregation explaination:
	// permissions.aggregate([{							// Multi-step process:
		// $project: { 									// Only show
			// users: { 									// working with sub-doc "users"
				// $filter: { 								// Ones that fit filter
					// input: "$users", 					// Where each in Users
					// as: "user",							// = "user"
					// cond: {								// Condition is that
						// $lte: ["$$user.permission", 8]	// the field user.permission, is less than or equal to 8
					// }
				// }
			// }
		// }
	// }])
}

//===============================================================
//		Load permissions in to local
//===============================================================
module.exports.masterPermissionsLoader = masterPermissionsLoader;
async function masterPermissionsLoader() {
	return new Promise((resolve,reject) => {
		RedisDB.hgetall("permissions", (err,docs) => {
			if(err) return reject(err);
			if(!docs) return reject(new Error("There's no permissions in cache"));

			fs.writeFile(path.join(__dirname, "../data/permissions.json"), JSON.stringify(docs), {encoding:"utf8"}, err => {
				if(err) return reject(err);
				console.info(chalk.black.bgGreen(" ✓ ") + " Permissions written. Path: " + path.join(__dirname, "../data/permissions.json"));
				return resolve(true);
			});
		});
	});
}