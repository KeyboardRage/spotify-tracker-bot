const {dmAndAwait,findUser,formatTime} = require("../../util/command-utilities");
const fn = require("../../util/response_functions");
const invite = "https://discord.gg/SEssczu";
const Discord = require("discord.js");
const {guildJobs,jobsModel,marketEvents,marketUserModel} = require("../../util/database");
const mongoose = require("mongoose"); 
const flags = require("./flags.json");
const {RedisDB} = require("../../util/redis");
const ACCESS = require("../../data/permissions.json");

// Permission checks
const staff = ACCESS.community|ACCESS.mod|ACCESS.admin|ACCESS.dev|ACCESS.owner;
const dev = ACCESS.dev|ACCESS.owner;

// TODO: All DB operations must be done on the gruonds that the bitfield "aborted" is not set.
// TODO: Moderators|Admin|Me can overwrite the permission check.

module.exports = {
	accept: async function(msg, args, doc) {
		return await _accept(msg, args, doc);
	},
	event: async function(meta, content) {
		return await _event(meta, content);
	},
	decline: async function(msg, args, doc) {
		return await _decline(msg, args, doc);
	},
	makeNewUser: async function(meta, msg, date) {
		return await _makeNewUser(meta, msg, date);
	},
	abort: async function(msg, args, doc) {
		return await _abort(msg, args, doc);
	},
	checkMax: async function(user) {
		return await _checkMax(user);
	}
};

async function _accept(msg, args, doc) {
	if(isNaN(args[1])) return msg.channel.send("**Invalid argument:** Where you wrote `"+args[1]+"`, you need to instead pass a job case ID.");
	let usr, guild, job, targ, stop=false;

	// Used to ignore checks:
	let b = {
		dev: (doc.level.userLevel&dev), // Is dev, bypass all
		staff: (doc.level.userLevel&staff), // Has staff permission
		staffAct: doc.level.staff, // An act as a staff member, not a user of the feature,
		guild: msg.channel.type==="text"?msg.guild.id:false // Guild ID or false
	};

	_checkMax(msg.author.id, b)
		.then(r => {
			if(parseInt(r)>=10) {
				stop=true;
				msg.channel.send("**Denied:** You already have 10 deals open. Finish some of them before accepting more.");
				return;
			}
			if (b.dev) return jobsModel.findOne({_id:args[1]});
			else if (b.staff && b.guild && b.staffAct) jobsModel.findOne({_id:args[1], guild:b.guild});
			else return jobsModel.findOne({_id:args[1], target:msg.author.id});
		})
		.then(doc => {
			if(stop) return;
			if(!doc) {
				stop=true;
				return msg.channel.send("**Not found:** Either the job case doesn't exist, you're not involved with it, or you are not the one to accept it.");
			}
			if(doc.flags&flags.job.aborted) {
				stop=true;
				return msg.channel.send("**Aborted:** This job case is closed for edits as it has been aborted.");
			}
			if(doc.flags&flags.job.accepted) {
				stop=true;
				return msg.channel.send("**Aborted:** You've already accepted this job case.");
			}
			if (doc.flags & flags.job.declined) {
				stop = true;
				return msg.channel.send("**Aborted:** You've already declined this job case.");
			}
			usr = doc.user;
			targ = doc.target;
			guild = doc.guild;
			job = doc._id;

			if(b.dev) return true;
			
			let string = `Buyer ${msg.author.id} accepted the job case.`;
			if(b.staff && b.staffAct) string = `A staff member ${msg.author.id} accepted the job case.`;

			let q = {"$set":{last_updated:Date(), flags: doc.flags|flags.job.accepted}};
			return _event({
				guild:guild,
				job:args[1],
				user:msg.author.id,
				hidden:false,
				content:string,
				created:Date(),
				files:null}, string, q);
		})
		.then(()=>{
			if(stop) return;
			return marketUserModel.findOne({_id:targ});
			// if(b.dev) {
			// 	return marketUserModel.findOne({_id:targ});
			// } else if (b.staff && b.staffAct) {
			// 	return marketUserModel.findOne({_id:targ});
			// } else return marketUserModel.findOne({_id:msg.author.id});
		})
		.then(async d=>{
			if(stop) return;
			if(d) return marketUserModel.updateOne({_id:targ}, {$push:{open:args[1]}});

			let user = {
				discord: msg.author.username,
				discriminator: msg.author.discriminator
			};

			if(b.dev || (b.staff && b.staffAct)) {
				let _u = await msg.client.fetchUser(targ).catch(err=>{throw err;});
				if(!_u) throw new Error("Could not find buyer.");
				user.discord = _u.username,
				user.discriminator = _u.discriminator;
			}

			// Make if not exist.
			d = new marketUserModel({
				_id: targ,
				meta: {
					discord: user.username,
					discriminator: user.discriminator,
					available: false,
					title: "Unknown buyer",
					main_type: 6,
					email: null,
					company: null,
					company_url: null,
					min_budget: null,
					color: parseInt(process.env.THEME.slice(1), 16)
				},
				portfolios: null,
				name: user.username,
				purchases: 0,
				sales: 0,
				reviews: null,
				open: [job],
				flags: null,
				last_updated: Date(),
				jobs: []
			});
			return d.save();
		})
		.then(()=>{
			if(stop) return;
			RedisDB.incr("jobs:open:" + targ);
			return guildJobs.updateOne({_id:guild}, {$set:{
				last_job_date: Date(),
			}, $inc: {
				total_jobs_created:1,
				jobs_open:1
			}});
		})
		.then(()=>{
			if(stop) return;
			return msg.client.fetchUser(usr);
		})
		.then(_usr => {
			if(stop) return;
			if(b.staff && b.staffAct) {
				return _usr.send(`Staff member <@${msg.author.id}> force-accepted job case \`${args[1]}\` for you.`);
			} else if (b.dev) {
				return _usr.send(`A bot dev force-accepted job case \`${args[1]}\` for you.`);
			} else return _usr.send(`<@${msg.author.id}> accepted job case \`${args[1]}\`.`);
		})
		.then(()=>{
			if(stop) return;
			return msg.author.send("Thank you for the confirmation. I've notified <@"+usr+">.");
		})
		.catch(err => {
			console.error(err);

			if (err.hasOwnProperty("code") && err.code === 5007) {
				msg.author.send("I was unable to notify the seller that you accepted the job. You may want to notify them.");
			} else {
				msg.channel.send("**Could not complete command:** A generic error occurred. Incident logged.");
				return fn.notifyErr(msg.client, err);
			}
		});
}

async function _decline(msg, args) {
	if(isNaN(args[1])) return msg.channel.send("**Invalid argument:** Where you wrote `"+args[1]+"`, you need to instead pass a job case ID.");
	let usr, guild,stop=false;
	jobsModel.findOne({_id:args[1], target:msg.author.id})
		.then(doc => {
			if(!doc) {
				stop=true;
				return msg.channel.send("**Not found:** Either the job case doesn't exist, you're not involved in it, or is not the one that can decline it.");
			}
			if(doc.flags&flags.job.aborted) {
				stop = true;
				return msg.channel.send("**Aborted:** This job case is closed for edits as it has been aborted.");
			}
			if(doc.flags&flags.job.accepted) {
				stop=true;
				return msg.channel.send("**Aborted:** You've already accepted this job case.");
			}
			if(doc.flags&flags.job.declined) {
				stop=true;
				return msg.channel.send("**Aborted:** This job case has already been declined.");
			}
			
			usr = doc.user;
			guild = doc.guild;
			let string = `Buyer ${msg.author.id} declined the job case.`;
			let q = {"$set":{last_updated:Date(), flags: doc.flags|flags.job.declined|flags.job.aborted}};
			return _event({
				guild: guild,
				job: args[1],
				user: msg.author.id,
				hidden: false,
				content: string,
				created: Date(),
				files: null}, string, q);
		})
		.then(()=>{
			if(stop) return;
			return marketUserModel.updateOne({_id:usr}, {$pull:{open:{$in:[args[1]]}, jobs:{$in:[args[1]]}}});
		})
		.then(()=>{
			if(stop) return;
			RedisDB.decr("jobs:open:" + usr); // Only needed once for seller, since buyer only gets status on accept.
			return guildJobs.updateOne({_id:guild}, {$inc:{jobs_aborted:1}});
		})
		.then(()=>{
			if(stop) return;
			removeIfZero(msg.client, usr);
			return msg.client.fetchUser(usr);
		})
		.then(usr => {
			if(stop) return;
			return usr.send(`<@${msg.author.id}> declined job \`${args[1]}\`.`);
		})
		.then(()=>{
			if(stop) return;
			return msg.author.send("Thank you for the feedback. I've notified <@"+usr+">.");
		})
		.catch(err => {
			console.error(err);

			if (err.hasOwnProperty("code") && err.code === 5007) {
				msg.author.send("I was unable to notify the seller that you declined the job. You may want to notify them.");
			} else {
				msg.channel.send("**Could not complete command:** A generic error occurred. Incident logged.");
				return fn.notifyErr(msg.client, err);
			}
		});
}

/**
 * Logs an event.
 * @param {Object} q jobsModel query overwrite
 */
async function _event(meta, content, q=null) {
	return new Promise((resolve,reject) => {
		let date = Date();
		let notifEvent = new marketEvents({
			_id: mongoose.Types.ObjectId(),
			guild: meta.guild,
			job: meta.job,
			user: meta.id,
			hidden: false,
			content: content,
			created: date,
			files: null
		});
		notifEvent.save()
			.then(()=>{
				if(!q) return jobsModel.updateOne({_id:meta.job}, {$set:{last_updated: date}});
				return jobsModel.updateOne({_id:meta.job}, q);
			})
			.then(()=>{
				return resolve(true);
			})
			.catch(err => {
				console.error(err);
				return reject(err);
			});
	});
}

async function _makeNewUser(meta, msg, date=Date()) {
	return new Promise(resolve => {
		let usr = new marketUserModel({
			_id: meta.id,
			meta: {
				discord: msg.author.username,
				discriminator: msg.author.discriminator,
				available: false,
				title: "Unknown seller",
				main_type: 5,
				email: null,
				company: null,
				company_url: null,
				min_budget: null,
				color: parseInt(process.env.THEME.slice(1), 16)
			},
			portfolios: null,
			name: msg.author.username,
			purchases: 0,
			sales: 0,
			reviews: null,
			open: [meta.job],
			flags: null,
			last_updated: date,
			jobs: [meta.job]
		});
		return resolve(usr);
	});
}

async function _abort(msg, args, doc) {
	if(isNaN(args[1])) return msg.channel.send("**Invalid argument:** Where you wrote `"+args[1]+"`, you need to instead pass a job case ID.");
	let _doc,user,step=0;

	// Used to ignore checks:
	let b = {
		dev: (doc.level.userLevel&dev), // Is dev, bypass all
		staff: (doc.level.userLevel&staff), // Has staff permission
		staffAct: doc.level.staff, // An act as a staff member, not a user of the feature,
		guild: msg.channel.type==="text"?msg.guild.id:false // Guild ID or false
	};

	if (b.dev||(b.staff && b.staffAct)) {
		return finalizeAbort(msg, doc, false, args[1], b);
	}

	jobsModel.findOneAndUpdate({
			_id: args[1],
			$or: [{
				target: msg.author.id
			}, {
				user: msg.author.id
			}]
	}, {
		$bit:{
			flags: {or:flags.job.requestAbort}
		},
		$set:{temp:msg.author.id}}, {new:false, runValidators:true, lean:true})
		.then(r => {
			_doc = r;
			if(_doc) {
				if(_doc.flagd^flags.job.accepted) {
					finalizeAbort(msg, _doc, true);
					return false;
				}
				if(_doc.flags&flags.job.aborted) {
					// If already aborted, stop.
					msg.channel.send("**Aborted:** The job case has already been aborted.");
					return false;
				}
				
				if(_doc.flags&flags.job.requestAbort && _doc.temp && _doc.temp===msg.author.id) {
					msg.channel.send("**Denied:** You have already sent a request to abort. Waiting on other party to agree with it to finalize.");
					return false;
				}

				if(_doc.flags&flags.job.requestAbort) {
					finalizeAbort(msg, _doc);
					return false;
				}
				if (_doc.flags & flags.job.declined) {
					msg.channel.send("**Aborted:** You've already declined this job case.");
					return false;
				}

				// Updated doc.
				if(_doc.user===msg.author.id) {
					step=1;
					// Creator sent abort request.
					return msg.client.fetchUser(_doc.target);
				} else {
					step=2;
					// Buyer sent abort request.
					return msg.client.fetchUser(_doc.user);
				}
			} else {
				// No doc found.
				step=3;
				throw new Error("**Denied:** Job case does not exist, or you're not part of this job case.");
			}
		})
		.then(r => {
			user=r;
			step=8; // lol i cant fuccen count :pog:
			// Update log event.
			return _event({guild:_doc.guild, job:_doc._id, user:msg.author.id}, `${_doc.user===msg.author.id?"Seller":"buyer"} ${msg.author.id} submitted a request to abort the job.`);
		})
		.then(() => {
			if(user===false) return false;
			if(user===null) {
				step=5;
				throw new Error("**Could not complete command:** I was unable to fetch information on the other party. It *could* be that the users account has been closed.\
				\n**The request to abort was successfull**, however, to gracefully end it the other party need to mutually agree.\
				\n**Optionally** a bot moderator/guild administrator can partake in the abort by also performing the same abort command to force a graceful abort of the job case.")
			}
			// User found.
			step=6;
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL)
				.addField(`**Abort request for job \`${_doc._id}\`:**`, `<@${user.id}> has requested to abort job \`${_doc._id}\`.\nTo accept the abort, use \`+job abort ${_doc._id}\`.`, true)
				.addField("**What will happen?**", "An abort is a way to gracefully end a deal that never went through. An abort will close its 'open' status on both parties' side, and will not count as a completed job, though also not a deal that 'ended badly'.", true)
				.addField("**Don't agree with this?**", "Use `+job cmds abort` to see more information/commands on what you can do with a one-sided decision to abort.");
			return user.send(embed);
		})
		.then(r=>{
			if(r===false) return false;
			step=7;
			return msg.author.send("**Success:** I've submitted the request to abort. The other party will have to mutually agree to do a graceful abort of the job case.");
		})
		.catch(err => {
			console.error(err);
			if (err.hasOwnProperty("code") && err.code === 50007 && step===6) {
				msg.author.send("**Partial failure:** I could not notify the other party of the request to abort due to their DM's being closed.\
				\nThe other party will have to mutually agree to do a graceful abort of the job case, so you're going to have to notify them.\
				\nUntil further action is taken from the other party, the job case will remain open / as-is.");
			} else {
				if(step===1||step===2) {
					// FETCHING caused error.
				} else if(step===3||step===5) {
					return msg.channel.send(err.toString());
				} else if (step===7) {
					msg.channel.send("<@"+msg.author.id+"> I was unable to notify you in DM: the request to abort job case "+args[1]+" was submitted successfully to the other party.")
						.catch(err=>{
							if(err.code && err.code === 50013) return;
							else return fn.notifyErr(msg.client, err);
						});
				} else if(step===8) {
					return msg.channel.send("**Error:** Something went wrong logging the event, **however the request to abort was successful**.\nYou have to notify the other party to perform the same command to do a mutual agreement of aborting the request.")
						.catch(()=>{return;});
				} else {
					msg.channel.send("**Could not complete command:** A generic error occurred. Incident logged.");
					return fn.notifyErr(msg.client, err);
				}
			}
		});
}

async function finalizeAbort(msg, doc, pulled=false, force=false, b) {
	let step=0,_doc;
	// doc = job model.
	// _doc = guild jobs
	if(force) {
		doc = await jobsModel.findOne({_id:force, guild:msg.guild.id}).catch(err=>{throw err;});
		if(!doc) return msg.channel.send("**Not found:** Could not find job case `"+force+"` in this guild.");
	}

	jobsModel.updateOne({_id:doc._id}, {$bit:{flags:{or:flags.job.aborted|flags.job.completed}, $set:{finished:Date()}}})
		.then(()=>{
			step=1;
			if(!pulled) return marketUserModel.updateOne({_id: doc.target}, {$pull:{open:doc._id}});
			return;
		})
		.then(()=>{
			step=2;
			// 1 after to ensure sync with DB.
			if(!pulled) {
				RedisDB.decr("jobs:open:" + doc.target);
			}
			return marketUserModel.updateOne({_id: doc.user}, {$pull:{open:doc._id}, jobs:doc._id});
		})
		.then(()=>{
			step=3;
			// 1 after to ensure sync with DB.
			RedisDB.decr("jobs:open:" + doc.user);
			if(!pulled) {
				removeIfZero(msg.client, doc.target);
				if(!b.staff && b.staffAct) {
					return _event({guild:doc.guild, user:msg.author.id, job:doc._id}, `A staff member ${msg.author.id} force-accepted the request to abort the job. It has now been cancelled, and all case detils are open to public.`);
				} else if (b.dev) {
					return _event({guild:doc.guild, user:msg.author.id, job:doc._id}, "A bot developer force-accepted the request to abort the job. It has now been cancelled, and all case detils are open to public.");
				} else {
					return _event({
						guild: doc.guild,
						user: msg.author.id,
						job: doc._id
					}, `${doc.user===msg.author.id?"Seller":"buyer"} ${msg.author.id} accepted the request to abort the job. It has now been cancelled, and all case detils are open to public.`);
				}
			}
			if(b.staff & b.staffAct) {
				return _event({
					guild: doc.guild,
					user: msg.author.id,
					job: doc._id
				}, `A staff member ${msg.author.id} force-aborted the request before it begun. All case detils are open to public.`);
			} else if (b.dev) {
				return _event({
					guild: doc.guild,
					user: msg.author.id,
					job: doc._id
				}, "A bot developer force-aborted the request before it begun. All case detils are open to public.");
			} else {
				return _event({
					guild: doc.guild,
					user: msg.author.id,
					job: doc._id
				}, `${doc.user===msg.author.id?"Seller":"buyer"} ${msg.author.id} aborted the request before it begun. All case detils are open to public.`);
			}
		})
		.then(()=>{
			step=4;
			removeIfZero(msg.client, doc.user);
			return guildJobs.findOneAndUpdate({_id:doc.guild}, {$inc:{jobs_aborted:1, jobs_open:-1}}, {new:true, lean:true});
		})
		.then(r=>{
			_doc = r;
			step=5;
			return msg.channel.send("**Success:** Job case `" + doc._id + "` was aborted.");
		})
		.then(()=>{
			if (_doc.notify && !pulled) {
				let string = `After agreement from multiple parties, job case \`${doc._id}\` was aborted.\nCase events and details are now open to public.`;
				step=6;
				if(b.staff & b.staffAct) {
					string = `A staff member <@${msg.author.id}> force-aborted job case \`${doc._id}\`.\nCase events and details are now open to public.`;
				} else if (b.dev) {
					string = `A bot developer force-aborted job case \`${doc._id}\`.\nCase events and details are now open to public.`;
				}
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor("#cd1818")
					.setFooter(`Job case ${doc._id}`, msg.client.user.avatarURL)
					.addField("**A job was aborted:**", string, true)
					.addField("**Core details:**", `**Created:** ${formatTime(doc.created, true)}\n**Number of events:** ${doc.events.length+1}\n**Seller:** <@${doc.user}>\n**Buyer:** <@${doc.target}>\n**Payment:** ${doc.meta.payment?doc.meta.payment:"None agreed upon."}\n**Deadline:** ${doc.meta.deadline?doc.meta.deadline:"None agreed upon."}\n**Brief:** ${doc.meta.brief}`, true);
				return msg.client.guilds.get(doc.guild).channels.get(_doc.notify).send(embed);
			}
			step=7;
			return;
		})
		.then(() => {
			step = 8;
			if(b.staff && b.staffAct) {
				msg.author.send("**Abort successful:** You should porentially notify the parties involved of the abort.");
				return false;
			} else if (b.dev) {
				return false;
			} else {
				return msg.client.fetchUser(msg.author.id===doc.user?doc.target:doc.user);
			}
		})
		.then(r => {
			step = 9;
			if(!pulled && r && r.send) {
				return r.send("**Abort successful:** Job case `" + doc._id + "` was aborted after agreement from multiple parties. It's been removed from borth parties' 'open' status.");
			} else if (r && r.send) {
				return r.send("**Abort successful:** Job case `" + doc._id + "` was aborted before it begun.");
			}
			return;
		})
		.catch(err=>{
			console.error(err);
			if(step===5) {
				if(_doc.notify && !pulled) {
					try {
						let string = `After agreement from multiple parties, job case \`${doc._id}\` was aborted.\nCase events and details are now open to public.`;
						step = 6;
						if (b.staff & b.staffAct) {
							string = `A staff member <@${msg.author.id}> force-aborted job case \`${doc._id}\`.\nCase events and details are now open to public.`;
						} else if (b.dev) {
							string = `A bot developer force-aborted job case \`${doc._id}\`.\nCase events and details are now open to public.`;
						}
						const embed = new Discord.RichEmbed()
							.setTimestamp(Date())
							.setColor("#cd1818")
							.setFooter(`Job case ${doc._id}`, msg.client.user.avatarURL)
							.addField("**A job was aborted:**", string, true)
							.addField("**Core details:**", `**Created:** ${formatTime(doc.created, true)}\n**Number of events:** ${doc.events.length+1}\n**Seller:** <@${doc.user}>\n**Buyer:** <@${doc.target}>\n**Payment:** ${doc.meta.payment}\n**Deadline:** ${doc.meta.deadline}\n**Brief:** ${doc.meta.brief}`, true);
						return msg.client.guilds.get(doc._guild).channels.get(_doc.notify).send(embed);
					} catch(_) {
						return;
					}
				}
				return fn.notifyErr(msg.client, new Error(`Error on step ${step} for aborting jobs. Message: ${msg.author.id}: ${msg.content}\nError message: `+err.toString()));
			}
			else if(step===6) return;
			else if(step===4) {
				return fn.notifyErr(msg.client, new Error(`Error on step ${step} for aborting jobs. Message: ${msg.author.id}: ${msg.content}\nError message: ` + err.toString()));
			} else if(step===1||step===2) {
				// Error updating users:
				msg.channel.send("**Error:** Unable to update users open job status. Incident has been reported.");
				return fn.notifyErr(msg.client, new Error(`Error on step ${step} for aborting jobs. Message: ${msg.author.id}: ${msg.content}\nError message: ` + err.toString()));
			} else if(step===3) {
				// Error adding event.
				if(!pulled) {
					msg.channel.send("**Success:** Job case `" + doc._id + "` was aborted after agreement from multiple parties.");
				} else {
					msg.channel.send("**Success:** Job case `" + doc._id + "` was aborted.");
				}
				return fn.notifyErr(msg.client, err);
			} else if(step===8||step===9) {
				return;
			} else {
				msg.channel.send("**Error:** Generic error during execution. Incident logged.");
				return fn.notifyErr(msg.client, err);
			}
		});
}

async function _checkMax(user, bypass) {
	return new Promise(resolve => {
		if(bypass.staff) return resolve(0);
		RedisDB.get("jobs:open:" + user, (err, res) => {
			if (err) return resolve(null);
			if (!res) return resolve(0);
			return resolve(res);
		});
	});
}

async function removeIfZero(Client, user) {
	RedisDB.get("jobs:open:"+user, (err,res) => {
		if(err) fn.notifyErr(Client, err);
		else {
			if(parseInt(res)===0) {
				RedisDB.del("jobs:open:"+user, err => {
					if(err) fn.notifyErr(Client, err);
				});
			}
		}
	});
}