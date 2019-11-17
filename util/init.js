const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
// CACHE / DATABASES ==============================================
const {RedisDB} = require("./redis");
const {serverSettings,botPerms,permsModel,marketUserModel} = require("./database");
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

		// Load users with open deals
		allCache.push(cacher_openDeals());

		Promise.all(allCache)
			.then(()=>{
				return resolve(true);
			})
			.catch(err=>{
				if(err) {
					console.error(chalk.black.bgRed(" × ") + chalk.red(" ERROR: masterCacheLoader() → "), err);
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

			let bans = false;
			if(globalBans.length!==0) {
				bans = true;
				RedisDB.sadd(["global_bans", ...globalBans], err => {
					if(err) return reject(err);
					console.info(chalk.black.bgGreen(" ✓ ")+ " Global bans cached. N:" + globalBans.length);
				});
			}
			if(localBans.length!==0) {
				bans = true;
				localBans.forEach((bans,server) => {
					RedisDB.sadd([`bans:${server}`, ...bans], err => {
						if(err) return reject(err);
					});
					console.info(chalk.black.bgGreen(" ✓ ") + " Local bans cached.");
				});
			}
			if(!bans) {
				console.info(chalk.black.bgGreen(" ✓ ") + " No bans to cache.");
				return resolve(null);
			} else return resolve(null);
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
// Async forEach definition
async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

async function cacher_openDeals() {
	return new Promise((resolve,reject) => {
		// Find all where "open[0]" exists, meaning length 1<
		let i=0;
		marketUserModel.find({"open.0":{$exists:true}}, ["_id","open"], async (err,docs) => {
			if(err) return reject(err);
			// Async forEach definition
			await asyncForEach(docs, async doc => {
				// jobs:open = userID:N
				i++;
				await _set(doc._id, doc.open.length).catch(err=>{return reject(err);});
			});
			console.info(chalk.black.bgGreen(" ✓ ") + " Open deals cached. N: "+i);
			return resolve(true);
		});
	});
}
async function _set(id,open) {
	return new Promise((resolve,reject) => {
		RedisDB.set("jobs:open:"+id, open, err => {
			if(err) return reject(err);
			return resolve(true);
		});
	});
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