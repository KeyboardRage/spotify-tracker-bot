//===============================================
// Tools for CMD's that need common functions.
//===============================================

const iso = require("iso8601-duration");
const {counterModel} = require("./database");
const fn = require("./response_functions");
const request = require("request");

/**
 * Slices an array from start to end. End being a word or index.
 * @param {Array} arr The source array
 * @param {Number|String} start An index or string to start by
 * @param {Number|String} end An index or string to end by
 * @returns {Array} A sliced array.
 */
module.exports.sliceUntil = async (arr, start = 0, end) => {
	end = (!end) ? arr.length : end; // End of the array.
	if (typeof (end) == "string") {
		arr = arr.slice((typeof(start)=="string")?arr.indexOf(start)+1:start, arr.indexOf(end));
	} else {
		arr = arr.slice((typeof(start)=="string")?arr.indexOf(start)+1:start, end);
	}
	return arr;
};

/**
 * Creates new time instance from semi-ISO6801 standard.
 * @class Time instance
 * @param {String} time Months => "mo". Minutes = "m".
 */
class isoTime {
	constructor(time) {
		this.time = time;
	}
	/**
	 * This is an absolute clusterfuck. GL navigating and making sense of it.
	 * Personally I wouldn't even touch it with a 10ft pole.
	 */
	_normalize(time) {
		let findMinutes = new RegExp(/([0-9]+M([0-9]|\W|$))/),
			findHours = new RegExp(/\d+(?:H)/),
			findSeconds = new RegExp(/\d+(?:S)/);
		time = time.toUpperCase().replace("P","").replace("T","");
		// There's a "Month" in this string.
		if(time.indexOf("MO") != -1) {
			// A month exist.
			if(regexIndexOf(time, findMinutes) == -1) {
				// NO MINUTES.
				if(time.indexOf("H")==-1) {
					if(time.indexOf("S")==-1) {
						// No hours, minutes, or seconds
						time = time.replace("MO", "M");
						console.log(time);
						return "P"+time;
					} else {
						// There's seconds.
						let ptime = insertAtPosition(time, "T", regexIndexOf(time, findSeconds)); // 1y2mo50s => 1y2moT50s
						ptime = ptime.replace("MO","M");
						return "P"+ptime;
					}
				} else {
					// There's hours.
					let ptime = insertAtPosition(time, "T", regexIndexOf(time, findHours)); // 1y2mo40h50s => 1y2moT40h50s
					ptime = ptime.replace("MO", "M");
					return "P"+ptime;
				}
			} else {
				// There's a minutes string.
				if(time.indexOf("H") == -1) {
					// There's a "hour" format in front of the minutes.
					let ptime = insertAtPosition(time, "T", regexIndexOf(time, findMinutes)); // 1y2mo30m50s => 1y2moT30m50s
					ptime = ptime.replace("MO", "M");
					return "P"+ptime;
				} else {
					// There's no "hour" format in front of the minutes.
					let ptime = insertAtPosition(time, "T", regexIndexOf(time, findHours)); // 1y2mo74h30m50s => 1y2moT74h30m50s
					ptime = ptime.replace("MO", "M");
					return "P"+ptime;
				}
			}

			// There's no month in this string.
		} else {
			if(time.indexOf("H") == -1) {
				if(time.indexOf("M") == -1) {
					if(time.indexOf("S") == -1) {
						// No months, hours, minutes or seconds.
						return "P" + time;
					} else {
						// No months, hours, or minutes — but there is seconds.
						let ptime = insertAtPosition(time, "T", regexIndexOf(time, findSeconds));
						return "P" + ptime;
					}
				} else {
					// No months, hours — but there is minutes.
					let ptime = insertAtPosition(time, "T", regexIndexOf(time, findMinutes));
					return "P" + ptime;
				}
			} else {
				// No months — but there is hours.
				let ptime = insertAtPosition(time, "T", regexIndexOf(time, findHours));
				return "P" + ptime;
			}
		}
	}
	/**
	 * @returns {Object} With the times broken up in to categories of elapse.
	 */
	parse() {
		let time = iso.parse(this._normalize(this.time));
		return time;
	}
	/**
	 * @returns {Date} A future date object
	 */
	end() {
		let period = iso.parse(this._normalize(this.time));
		console.log(period);
		let time = iso.end(period);
		return time;
	}
}
module.exports.isoTime = isoTime;

function formatTime(time, clock=false) {
	time = new Date(time);
	let months=["Jan.","Feb.","Mar.","Apr.","May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
	let days=["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	let hours = time.getHours().toString().length;
	let minutes = time.getMinutes().toString().length;
	if (clock) return `${days[time.getDay()]} ${months[time.getMonth()]} ${time.getDate()}, ${time.getFullYear()} @ ${hours===1?"0"+hours:hours}:${minutes===1?"0"+minutes:minutes}`;
	return `${days[time.getDay()]} ${months[time.getMonth()]} ${time.getDate()}, ${time.getFullYear()}`;
}
module.exports.formatTime = formatTime;

/**
 * Like string.indexOf, except it uses regEx to find the position
 * @param {String|Array} input A string or array
 * @param {RegExp} regex The regular expression to search with
 * @param {Number} end Optional. End position.
 * @returns {Number} Index position. -1 if no matches.
 * @example
 * if(regexIndexOf(array, /\w+/) == -1) {...}
 */
function regexIndexOf(input, regex, startpos=0) {
	if(typeof(input) == "string") {
		let indexOf = input.substring(startpos).search(regex);
		return (indexOf >= 0) ? (indexOf + (startpos)) : indexOf;
	} else if(Array.isArray(input)) {
		for(let i=0;i<input.length;i++) {
			if (input[i].match(regex)) {
				return i;
			}
		}
		return -1;
	}
	throw new Error("Invalid type: Not string or array");
}
module.exports.regexIndexOf = regexIndexOf;

/**
 * Insert a string at the index position of another string
 * @param {String} string The original string
 * @param {String} newString The string to insert
 * @param {Number} index Index position of origianl string to insert at
 * @returns {String} Returns a new string.
 * @example
 * let newString = insertAtPosition("fuck", "cking du", 2); // fucking duck
 */
function insertAtPosition(string, newstring, position) {
	return [string.slice(0, position), newstring, string.slice(position)].join("");
}
module.exports.insertAtPosition = insertAtPosition;

/**
 * Simply function to check if an array only contain ID's.
 * @param {Array} array To search in.
 * @returns {Boolean} True if only ID's.
 */
module.exports.onlyIds = function(array) {
	return (array.filter(elm => /[^0-9]+/.test(elm)).length == 0);
};
/**
 * Check if an array or string contain your own UID.
 * @param {Array|String} input The input string/array
 * @param {Object} msg The original message object
 * @returns {Boolean} True if contains self.
 */
module.exports.containsSelf = function(input, msg) {
	if(typeof(input) == "object") {
		// Search array.
		return (input.indexOf(msg.author.id) != -1);
	} else {
		// Search string.
		console.log("Substringing selfCheck");
		return (regexIndexOf(input, msg.author.id) != -1);
	}
};

/**
 * Put variables in to texts, so I can store long-ass texts in JSON instead
 * @param {String} input The string input
 * @param {Object} data Object KEY must match {{KEY}} variable
 * @returns {String} A string with the data
 */
function parser(input, data) {
	let res = input;
	// if (Array.isArray(data)) {
	// 	// Arary
	// 	data.forEach(elm => {
	// 		return; // Not done yet, and won't be until needed.
	// 	})
	// } else if (typeof (data) == "string") {
	// 	// Single string
	// } else {
	// 	// Object
	// }
	let handle = new RegExp(/{{\w+(=\w+)?}}/, "gi");
	for (let key in data) {
		if (data.hasOwnProperty(key)) res = res.replace("{{" + key + "}}", data[key]);
	}
	return res;
}
module.exports.parser = parser;
	
/**
 * Gets an user object from a mention.
 * @param {Object} Client Requires the Client (the bot) as first parameter.
 * @param {Object} Mention The mention object
 * @returns {Object} Returns user objet
 */
function getUserFromMention(Client, mention) {
	let user = mention.match(/^<@!?(\d+)>$/);
	user = (user) ? user[1] : null;
	return Client.users.get(user);
}
module.exports.getUserFromMention = getUserFromMention;

/**
 * Gets an role object from a mention.
 * @param {Object} Client Requires the Client (the bot) as first parameter.
 * @param {Object} Mention The mention object
 * @returns {Object} Returns role objet
 */
function getRoleFromMention(Client, mention) {
	let role = mention.match(/^<@&(\d+)>$/);
	role = (role) ? role[1] : null;
	return Client.users.get(role);
}
module.exports.getRoleFromMention = getRoleFromMention;

/**
 * Returns the Real command from an alias, or null
 * @param {Object} commands The Client.commands
 * @param {String} alias Alias or command to check if has existing alias and get real command for.
 * @returns {String} The real command or null
 */
function alias(commands, cmd) {
	if(typeof commands === "string") {
		console.error("You forgot to give the Client.commands first!");
		return;
	}
	let realCmd = null;
	if (commands.hasOwnProperty(cmd)) {
		realCmd = cmd
	} else {
		// Else check aliases and return valid command
		for (let command in commands) {
			if (commands[command].aliases.indexOf(cmd) !== -1) {
				realCmd = commands[command].cmd;
				break;
			}
		}
	}
	return realCmd;
}
module.exports.alias = alias;

/**
 * @param {Object} Client The bot itself
 * @returns {Object} Guild object that contains the main emotes.
 */
function emoteGuild(Client) {
	return Client.guilds.find(guild => guild.id === "439536193907064842");
}
module.exports.emoteGuild = emoteGuild;

/**
 * Gives back the emote by ID.
 */
function emote(Client, emote) {
	let emojiGuild = emoteGuild(Client);
	switch (emote) {
	case "one":
		return emojiGuild.emojis.get("588844523329683476");
	case "two":
		return emojiGuild.emojis.get("588844524659540030");
	case "three":
		return emojiGuild.emojis.get("588844524659539972");
	case "four":
		return emojiGuild.emojis.get("588844515520020598");
	case "five":
		return emojiGuild.emojis.get("588844516283252736");
	case "six":
		return emojiGuild.emojis.get("588844524332384276");
	case "seven":
		return emojiGuild.emojis.get("588844523938119680");
	case "eight":
		return emojiGuild.emojis.get("588844512286343179");
	case "nine":
		return emojiGuild.emojis.get("588844524433047552");
	case "zero":
		return emojiGuild.emojis.get("588844524474859531");
	case "a":
		return emojiGuild.emojis.get("588844508968386753");
	case "b":
		return emojiGuild.emojis.get("588844511858393091");
	case "c":
		return emojiGuild.emojis.get("588844512168902705");
	case "d":
		return emojiGuild.emojis.get("588844512244269167");
	case "e":
		return emojiGuild.emojis.get("588844512433012746");
	case "f":
		return emojiGuild.emojis.get("588844515406905345");
	case "g":
		return emojiGuild.emojis.get("588844515813621779");
	case "h":
		return emojiGuild.emojis.get("588844522591486122");
	case "i":
		return emojiGuild.emojis.get("588844523040407592");
	case "j":
		return emojiGuild.emojis.get("588844523019304963");
	case "add":
		return emojiGuild.emojis.get("588844511489425408");
	case "subtract":
	case "remove":
		return emojiGuild.emojis.get("588844523879137290");
	case "stop":
	case "abort":	
		return emojiGuild.emojis.get("588844523832999936");
	case "pause":
		return emojiGuild.emojis.get("588844523640061975");
	case "resume":
	case "play":
		return emojiGuild.emojis.get("588844523782799405");
	case "previous":
		return emojiGuild.emojis.get("588844523204116501");
	case "next":
		return emojiGuild.emojis.get("588844523128487936");
	case "info":
		return emojiGuild.emojis.get("588844523052859392");
	case "about":
		return emojiGuild.emojis.get("588844511103287336");
	case "ellipsis":
		return emojiGuild.emojis.get("588844515461300448");
	case "check":
	case "yes":
		return emojiGuild.emojis.get("588844524177195047");
	case "grafik":
		return emojiGuild.emojis.get("588847763341705263");
	default:
		throw new Error("No emote defined!");
	}
}
module.exports.emote = emote;

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}
/**
 * Add the array of emotes to the passed in message.
 * @param {Object} Client The bot
 * @param {Object} msg The target message element
 * @param {Array} emotes Emotes by name
 * @returns {Array} Returns ID's of the used emotes.
 */
async function emotes(Client, msg, array) {
	let usedEmotes = Array();
	await asyncForEach(array, async reaction => {
		// let getEmote = emote(Client, reaction);
		// usedEmotes.push(getEmote.id);
		usedEmotes.push(reaction);
		await msg.react(reaction);
	});
	return usedEmotes;
}
module.exports.emotes = emotes;


/**
 * Checks if the bot has the perms listed in the array
 * @param {Object} msg The original message object
 * @param {Array} perms List of permission to check if bot has
 * @returns {Object} NamedPerm:Boolean
 */
function myPerms(msg, perms) {
	let botty = msg.guild.members.find(user => user.id === process.env.BOT_ID),
		obj = Object();

	perms.forEach(perm => {
		obj = {...obj, [perm]:botty.hasPermission(perm)};
	});

	obj.missing = Object.keys(obj).filter(key => !obj[key]);
	return obj;
}
module.exports.myPerms = myPerms;

/**
 * Sends a DM message to author, and awaits the result
 * @param {Object} author The author object
 * @param {String} text The text to send in DM
 * @param {Object} options Optional.
 * @returns {Promise} Promise, which resolves to the plaintext of the message
 * @example
 * dmAndAwait(msg.author, "This is a DM!", {maxMatches: 1,time: 120000,errors:["time"]})
 * .then(reply => {
 *		if(reply === "Hi") console.log("User said Hi!");
 * 		else console.log("User said "+reply);
 * })
 * .catch(err => console.error(err));
 */
async function dmAndAwait(author, text, options={maxMatches: 1,time: 120000,errors:["time"]}) {
	return new Promise((resolve,reject) => {
		author.send(text)
			.then(message => {
				return message.channel.awaitMessages(msg=>!msg.author.bot, options);
			})
			.then(collected => {
				return resolve(collected.first().content);
			})
			.catch(err => {
				return reject(err);
			});
	});
}
module.exports.dmAndAwait = dmAndAwait;

/**
 * Sends a DM message to author, and awaits the result
 * @param {Object} msg The original msg object
 * @param {String} text The text to send in DM
 * @param {Object} options Optional.
 * @returns {Promise} Promise, which resolves to the plaintext of the message
 * @example
 * sendAndAwait(msg, "This is a message!", {maxMatches: 1,time: 120000,errors:["time"]})
 * .then(reply => {
 *		if(reply === "Hi") console.log("User said Hi!");
 * 		else console.log("User said "+reply);
 * })
 * .catch(err => console.error(err));
 */
async function sendAndAwait(msg, text, options={maxMatches: 1,time: 120000,errors:["time"]}) {
	return new Promise((resolve,reject) => {
		msg.channel.send(text)
			.then(message => {
				return message.channel.awaitMessages(sender=>(sender.author.id === msg.author.id), options);
			})
			.then(collected => {
				return resolve(collected.first().content);
			})
			.catch(err => {
				return reject(err);
			});
	});
}
module.exports.sendAndAwait = sendAndAwait;

/**
 * Guild role tool
 * @param {Object} guild The msg.guild object
 * @example
 * let role = new Role(msg.guild);
 * let roleID = await role.id("my-role");
 * let roleName = await role.name("my-role");
 */
class Role {
	constructor(guild) {
		this.roles = guild.roles;
	}
	/**
	 * Takes string input and searches guild for a Role ID
	 */
	id(/**@type {String}*/input) {
		return new Promise((/**@type {Promise<String|null>}*/resolve,/**@type {Error}*/reject) => {
			try {
				// Simple line to make "everyone" work.
				if(input==="everyone") input = "@everyone";

				//TODO: Solve find everyone

				let guildRole = function(id) {
					return this.roles.get(id);
				};
				
				// Get role by pure ID
				if (/^(\d+)$/.test(input)) {
					if (guildRole(input)!==undefined) return resolve(input);
					else return resolve(null);
				}

				// Get role by tag
				else if (/^<@&(\d+)>$/.test(input)) {
					let id = input.slice(3, -1);
					if (guildRole(input) !== undefined) return resolve(id);
					else return resolve(null);
				}

				// Get role by name
				else {
					let role = this.roles.find(r => r.name === input);
					if (role) return resolve(role.id);
					else return resolve(null);
				}
			} catch (err) {
				return reject(err);
			}
		});
	}
	/**
	 * Tries to find role name based on ID input
	 */
	name(/**@type {String}*/input) {
		let role = this.roles.get(input);
		if(role) return role.name;
		else return null;
	}
}
module.exports.Role = Role;

/**
 * Searches for user, globall (by ID), or in guild by name, mention, ID, username, or tag.
 * @param {"Client"} Client The bot itself
 * @param {String} input The input to search for user on
 * @param {Object} [options={onlyId:false<Boolean>, inGuild:false<String>, msg:false<Object>, loose:false<Object>}] Options. OnlyId is the only boolean, rest require the string/object.
 * @returns {Promise} Resolves to desired result or null.
 * @example
 * let userId_inMention = await findUser(msg.client, "name", {onlyId:true, inGuild:"123123123123", msg:msg});
 */
async function findUser(Client, input, options={onlyId:false,inGuild:false,msg:false,loose:false}) {
	return new Promise(async resolve => {
		let user;
		if(options.inGuild) {
			let guild = Client.guilds.get(options.inGuild);
			if(!guild) return resolve(null);

			user = guild.members.find(u => u.user.id == input);
			if(user) return resolve((options.onlyId)?user.id:user);

			if(options.msg) {
				user = options.msg.mentions.members.first();
				if(user)return resolve((options.onlyId)?user.id:user);
			}

			user = guild.members.find(u => u.user.tag.toLowerCase() == input.toLowerCase()) || guild.members.find(u => u.user.username.toLowerCase() == input.toLowerCase()) || guild.members.find(u => u.displayName.toLowerCase() == input.toLowerCase());
			if(user) return resolve((options.onlyId)?user.id:user);

			looseSearch(input, options.loose)
				.then(u=>{
					if(options.onlyId) return u;
					return Client.fetchUser(u);
				})
				.then(u => {
					return resolve(u);
				})
				.catch(() => {
					return resolve(null);
				});
		}

		// Only search outside if it's an ID.
		if(/^[0-9]{16,32}$/.test(input)) { 
			user = getUser(input).catch(()=>{return resolve(null);});
			return resolve((options.onlyId)?user.id:user);
		} else return resolve(null);
	});

	//! Deprecated:
	// // By ID
	// if (/^(\d+)$/.test(input)) {
	// 	let u = (sameGuild) ? msg.guild.members.get(input) : msg.client.fetchUser(input);
	// 	if (u) return u;
	// }
	// // By mention
	// if (/^<@&(\d+)>$/.test(input)) {
	// 	let u = (sameGuild) ? msg.guild.members.get(input) : msg.client.fetchUser(input);
	// 	if (u) return u;
	// }
	// // By name
	// let u = (sameGuild) ? msg.guild.members.find(u => u.user.username.toLowerCase() === input.toLowerCase()) : msg.client.find(u => u.username.toLowerCase() === input.toLowerCase());
	// if (u) return u;
	// return null;
}
module.exports.findUser = findUser;


async function counter_number(sequenceName) {
	return new Promise((resolve,reject) => {
		counterModel.findOneAndUpdate({_id: sequenceName}, {$inc:{sequenceValue:1}}, {"new":true}, (err,doc) => {
			if (err) return reject(err);
			else return resolve(doc.sequenceValue);
		});
	});
}
module.exports.counter_number = counter_number;

module.exports.editAndAwait = editAndAwait;
async function editAndAwait(/**@type {"msg"}*/msg, /**@type {String}*/await_sender_id, /**@type {Object}*/message, /**@type {Object}*/options={maxMatches: 1,time: 120000,errors:["time"]}) {
	return new Promise((resolve,reject) => {
		msg.edit(message)
			.then(m => {
				return m.channel.awaitMessages(sender=>(sender.author.id === await_sender_id), options);
			})
			.then(collected => {
				return resolve(collected.first().content);
			})
			.catch(err => {
				return reject(err);
			});
	});
}


/**
 * Fetches a User instance based on UID.
 * @param {"Client"} Client The bot itself
 * @param {String} userId The user ID to fetch
 * @returns {Promise} Returns user or null, rejects any errors
 */
async function getUser(Client, userId) {
	return new Promise((resolve,reject) => {
		Client.fetchUser(userId)
			.then(u => {return resolve(u);})
			.catch(err => {
				if (err.code===10013) return resolve(null);
				return reject(err);
			});
	});
}
module.exports.getUser = getUser;



/**
 * Gets a direct image link from an indirect image link on imgur
 * @param {String} URL_ID The ~5 character URL ID.
 * @returns {Promise} Resolves to direct link if success, or the ID if failed.
 */
module.exports.getImgur = getImgur;
async function getImgur(input) {
	return new Promise(resolve => {
		request.get(`https://api.imgur.com/3/album/${input}/images`, {headers:{"Authorization":`Client-ID ${process.env.IMGUR_ID}`}}, (err,res,body) => {
			if(err) return resolve(input);
			if(res.statusCode!==200) return resolve(input);
			try {
				body = JSON.parse(body);
				if(body.data && body.data.length && body.data[0].link) return resolve(body.data[0].link);
				else return resolve(input);
			} catch(_){
				return resolve(input);
			}
		});
	});
}

/**
 * Loose search for user's username or nickname in guilds
 * @param {String} input The name to search for
 * @param {Map} members Discord.js guild members collection
 * @param {Number} [timeout=2000] Max time to allow for search to finish
 * @returns {Promise} Resolves: UID, null if no user, false if timed out.
 * @example
 * let user = looseSearch(args.join(" "), msg.guild.members, 3000);
 * if(!user) return msg.channel.send(user===false?"Search took too long":"Could not find user in guild");
 */
module.exports.looseSearch = looseSearch;
async function looseSearch(input, members, timeout=2000) {
	return new Promise(done => {
		Promise.race([new Promise(r=>setTimeout(()=>{r(done(false));}, timeout)), new Promise(r => {
			let users = members.map(u=>{return {n:u.displayName.toLowerCase(), id:u.id};});
			for (let i = 0; i < users.length; i++) {
				for (let n = 0; n < users[i].n.length; n++) {
					if (users[i].n.slice(0, n).startsWith(input.toLowerCase())) {
						return r(done(users[i].id));
					}
				}
			}
			return r(done(null));
		})]);
	});
}
