const {dmAndAwait,findUser,formatTime} = require("../../util/command-utilities");
const fn = require("../../util/response_functions");
const invite = "https://discord.gg/SEssczu";
const Discord = require("discord.js");
const {guildJobs,jobsModel,marketEvents,marketUserModel} = require("../../util/database");
const mongoose = require("mongoose"); 
const flags = require("./flags.json");

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
	abort: async function(msg, args) {
		return await _abort(msg, args);
	}
};

async function _accept(msg, args) {
	if(isNaN(args[1])) return msg.channel.send("**Invalid argument:** Where you wrote `"+args[1]+"`, you need to instead pass a job case ID.");
	let usr, guild, job, stop=false;
	jobsModel.findOne({_id:args[1], target:msg.author.id})
		.then(doc => {
			if(!doc) {
				stop=true;
				return msg.channel.send("**Not found:** Either the job case doesn't exist, or you're not involved with it.");
			}
			if(doc.flags&flags.job.accepted) {
				stop=true;
				return msg.channel.send("**Aborted:** You've already accepted this job case.");
			}
			usr = doc.user;
			guild = doc.guild;
			job = doc._id;
			let string = `Buyer ${msg.author.id} accepted the job case.`;
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
			return marketUserModel.findOne({_id:msg.author.id});
		})
		.then(d=>{
			if(d) return marketUserModel.updateOne({_id:msg.author.id}, {$push:{open:args[1]}});

			// Make if not exist.
			d = new marketUserModel({
				_id: msg.author.id,
				meta: {
					discord: msg.author.username,
					discriminator: msg.author.discriminator,
					available: false,
					title: "Unknown buyer",
					main_type: 6,
					email: null,
					company: null,
					company_url: null,
					min_budget: null,
					color: process.env.THEME
				},
				portfolios: null,
				name: msg.author.username,
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
			_usr.send(`<@${msg.author.id}> accepted job case \`${args[1]}\`.`);
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
				return msg.channel.send("**Not found:** Either the job case doesn't exist, or you're not involved with it.");
			}
			if(doc.flags&flags.job.accepted) {
				stop=true;
				return msg.channel.send("**Aborted:** You've already accepted this job case.");
			}
			if(doc.flags&flags.job.declined) {
				stop=true;
				return msg.channel.send("**Aborted:** You've already declined this job case.");
			}
			
			usr = doc.user;
			guild = doc.guild;
			let string = `Buyer ${msg.author.id} declined the job case.`;
			let q = {"$set":{last_updated:Date(), flags: doc.flags|flags.job.declined}};
			return _event({
				guild: msg.guild.id,
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
			return guildJobs.updateOne({_id:guild}, {$inc:{jobs_aborted:1}});
		})
		.then(()=>{
			if(stop) return;
			return msg.client.fetchUser(usr);
		})
		.then(usr => {
			if(stop) return;
			return usr.send(`<@${msg.author.id}> declined job \`${args[1]}\`.`);
		})
		.then(()=>{
			if(stop) return;
			return msg.author.send("Thank you for the feedback. I've notified <@"+usr.id+">.");
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

//TODO: Disable ability to send another abort request after one is sent.
//TODO: Fix agreement from other user just basically sending a new request reversed.
async function _abort(msg, args) {
	if(isNaN(args[1])) return msg.channel.send("**Invalid argument:** Where you wrote `"+args[1]+"`, you need to instead pass a job case ID.");
	let _doc,user,step=0;
	return jobsModel.findOneAndUpdate({
		_id:args[1], 
		$or:[{
			target:msg.author.id
		}, {
			user:msg.author.id
		}]}, {
		$bit:{
			flags: {and:flags.job.requestAbort}
		}}, {new:true, runValidators:true, lean:true})
		.then(r => {
			_doc = r;
			if(_doc) {
				if(_doc.flags&flags.job.aborted) {
					// If already aborted, stop.
					msg.channel.send("**No action:** The job case has already been aborted.");
					return false;
				}

				if(_doc.flags&flags.job.requestAbort) {
					finalizeAbort(msg, _doc);
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

async function finalizeAbort(msg, doc) {
	let step=0,_doc;
	jobsModel.updateOne({_id:doc._id}, {$bit:{flags:{and:flags.job.aborted}, $set:{finished:Date()}}})
		.then(()=>{
			step=1;
			return marketUserModel.updateOne({_id: doc.target}, {$pull:{open:doc._id}});
		})
		.then(()=>{
			step=2;
			return marketUserModel.updateOne({_id: doc.user}, {$pull:{open:doc._id}, jobs:doc._id});
		})
		.then(()=>{
			step=3;
			return _event({guild:doc.guild, user:msg.author.id, job:doc._id}, `${doc.user===msg.author.id?"Seller":"buyer"} ${msg.author.id} accepted the request to abort the job. It has now been cancelled, and all case detils are open to public.`);
		})
		.then(()=>{
			step=4;
			return guildJobs.findOneAndUpdate({_id:doc.guild}, {$inc:{jobs_aborted:1, jobs_open:-1}}, {new:true, lean:true});
		})
		.then(r=>{
			_doc = r;
			step=5;
			return msg.channel.send("**Success:** Job case `" + doc._id + "` was aborted after agreement from multiple parties. It's been removed from borth parties' 'open' status.");
		})
		.then(()=>{
			if(_doc.notify) {
				step=6;
				const embed = new Discord.RichEmbed()
					.setTimestamp(Date())
					.setColor("#cd1818")
					.setFooter(`Job case ${doc._id}`, msg.client.user.avatarURL)
					.addField("**A job was aborted:**", `After agreement from multiple parties, job case \`${doc._id}\` was aborted.\nCase events and details are now open to public.`, true)
					.addField("**Core details:**", `**Created:** ${formatTime(doc.created, true)}\n**Number events:** ${doc.events.length}\n**Seller:** <@${doc.user}>\n**Buyer:** <@${doc.target}>\n**Payment:** ${doc.meta.payment}\n**Deadline:** ${doc.meta.deadline}\n**Brief:** ${doc.meta.brief}`, true);
				return msg.client.guilds.get(doc._guild).channels.get(_doc.notify).send(embed);
			}
			step=7;
			return;
		})
		.catch(err=>{
			if(step===5) {
				if(_doc.notify) {
					try {
						const embed = new Discord.RichEmbed()
						.setTimestamp(Date())
						.setColor("#cd1818")
						.setFooter(`Job case ${doc._id}`, msg.client.user.avatarURL)
						.addField("**A job was aborted:**", `After agreement from multiple parties, job case \`${doc._id}\` was aborted.\nCase events and details are now open to public.`, true)
						.addField("**Core details:**", `**Created:** ${formatTime(doc.created, true)}\n**Number events:** ${doc.events.length}\n**Seller:** <@${doc.user}>\n**Buyer:** <@${doc.target}>\n**Payment:** ${doc.meta.payment}\n**Deadline:** ${doc.meta.deadline}\n**Brief:** ${doc.meta.brief}`, true);
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
				msg.channel.send("**Success:** Job case `" + doc._id + "` was aborted after agreement from multiple parties.");
				return fn.notifyErr(msg.client, err);
			} else {
				msg.channel.send("**Error:** Generic error during execution. Incident logged.");
				return fn.notifyErr(msg.client, err);
			}
		});
}