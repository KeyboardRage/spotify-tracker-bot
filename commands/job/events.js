const Discord = require("discord.js");
const fn = require("../../util/response_functions");
const {sendAndAwait} = require("../../util/command-utilities");
const {guildJobs,jobsModel,marketEvents,marketUserModel} = require("../../util/database");
const flags = require("./flags.json");
const {RedisDB} = require("../../util/redis");
const {checkMax} = require("./minors");
const ACCESS = require("../../data/permissions.json");
const request = require("request");
const mongoose = require("mongoose");

module.exports = main;
async function main(msg, args, doc) {
	args.shift(); // Remove '+|event'
	if(isNaN(args[0])) {
		// Not targetting specific job.
		// User has multiple jobs open. Ask which job to add event to.
		// User has 1 job open.
		let stop=false;
		checkMax(msg.author.id)
			.then(r => {
				//TODO: Flags must be fixed first on accept. Currently broken. Sets flags to 0.
				if(!r) {stop=true;return msg.channel.send("**No action:** You do not have any open jobs to attach a new event to.");}
				if(r==1) return jobsModel.findOne({$or:[{target:msg.author.id}, {user:msg.author.id}], flags:{$bitsAllClear:flags.job.aborted|flags.job.declined, $bitsAllSet:flags.job.accepted}});
				else return sendAndAwait(msg, "**Multiple matches:** You have "+r+" jobs open. Which case ID you like to attach this event to?");
			})
			.then(r=> {
				if(stop) return;
				if(!r) {stop=true;return msg.channel.send("**Denied:** You are not part of this job case.");}
				else if (typeof(r)==="string") return jobsModel.findOne({_id:r, $or:[{target:msg.author.id}, {user:msg.author.id}]});
				else return r;
			})
			.then(r=> {
				if(stop) return;
				if(!r) {stop=true;return msg.channel.send("**Denied:** You are not part of this job case.");}
				if(r.flags&(flags.job.aborted|flags.job.completed|flags.job.declined)) {stop=true;return msg.channel.send("**Denied:** This job has already been closed. You may only attach a review/report to it.");}
				return addToJob(msg, args, r, doc.prefix);
			})
			.catch(err=>{
				if(err.size===0) return msg.channel.send("**Aborted:** Time ran out waiting for a reply.");
				fn.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** A generic error occurred trying to check open jobs.");
			});
	} else {
		// Targetting specific job
		jobsModel.findOne({_id:args[0], $or:[{target:msg.author.id}, {user:msg.author.id}]})
			.then(r=> {
				if(!r) {return msg.channel.send("**Denied:** You are not part of this job case.");}
				if(r.flags&(flags.job.aborted|flags.job.completed|flags.job.declined)) return msg.channel.send("**Denied:** This job has already been closed. You may only attach a review/report to it.");
				args.shift(); // Remove number from args.
				return addToJob(msg, args, r, doc.prefix);
			}).catch(err => {
				fn.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** A generic error occurred trying to check open jobs.");
			});
	}
}

// crypto.createHash("md5").update(`${msg.author.id}${date}`).digest("hex")
async function addToJob(msg, args, doc, prefix) {
	// doc = job document.
	let stop=false;
	let data = {
		_id: new mongoose.mongo.ObjectId(),
		job: doc._id,
		user: msg.author.id,
		hidden: false, // ADD CHECK
		content: args.join(" "),
		guild: doc.guild
	};
	doc = doc.toObject();
	if(msg.attachments.size) {
		data.files = msg.attachments.map(a => {
			return {
				url: a.url,
				name: a.filename,
				size: a.filesize
			};
		});
		backendEvent(msg, data)
			.then(r=>{
				if(r===false) return stop=true;
				data=r;
				return jobsModel.updateOne({_id:doc._id}, {$set:{last_updated:Date()}, $push:{events:r._id}});
			})
			.catch(err=> {
				// Some kind of error, but try to save anyway.
				fn.notifyErr(msg.client, err);
				stop=true;
				return msg.channel.send("**Error:** A generic error occurred trying to retrieve the file(s). Event submission aborted, and incident logged.");
			})
			.finally(()=>{
				if(stop) return;
				msg.channel.send("<:Add:588844511489425408> **Event added:** Your content was successfully added to job case `" + doc._id + "` — " + data.files.length + " file(s).\n*All files are hidden until the job is complete. See `" + prefix + "job info files` for full information.*");
				return notifyOtherParty(msg, data, doc.user===msg.author.id?doc.target:doc.user);
			});
	} else {
		// Just save doc.
		let event = new marketEvents(data);
		event.save(err=>{
			if(err) {
				fn.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** A generic error occurred trying to add the event. Incident logged.");
			} else {
				msg.channel.send("<:Add:588844511489425408> **Event added:** Your content was successfully added to job case `" + doc._id + "`.");
				return notifyOtherParty(msg, data, doc.user===msg.author.id?doc.target:doc.user);
			}
		});
	}
}

async function backendEvent(msg, data) {
	return new Promise((resolve,reject) => {
		// Send request to backend
		console.log(data);
		request.post(`${process.env.NEW_API}${process.env.API_VERSION}/submit/event`, {form:data}, (err,res,body) => {
			if(err) {
				fn.notifyErr(msg.client, err);
				return msg.channel.send("**Error:** An error occurred trying to initiate file retrieval. Incident logged.");
			} else if (res.statusCode !== 200) {
				try {
					body = JSON.parse(body);
					msg.channel.send(body.message);
					return resolve(false);
				} catch (_) {
					return reject(new Error("Job.newEvent.files → Could not parse JSON + Backend responded with status code " + res.statusCode));
				}
			} else {
				try {
					body = JSON.parse(body);
					return resolve(body.message);
				} catch (_) {
					return reject(new Error("Job.newEvent.files → Could not parse JSON response from backend"));
				}
			}
		});
	});
}

async function notifyOtherParty(msg, data, target) {
	msg.client.fetchUser(target)
		.then(r => {
			console.log(r);
			if(!r) return;
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(`Job case: ${data.job} — Event ID: ${data._id}`, msg.client.user.avatarURL);
			if(data.content.length) {
				embed.addField("**Content:**", data.content);
			}
			if(data.files) {
				let string = data.files.map(e => `• ${e.name} — File size: ${e.size>10000?(e.size/1000/1000).toFixed(2)+" MB":(e.size/1000).toFixed(2)+" KB"}`);
				embed.addField("**Files:**", string);
			}
			return r.send("<:Info:588844523052859392> **New event:** <@"+msg.author.id+"> added a new event:", embed);
		}).catch(err=>{
			console.log(err);
			if (err.code === 50007) return;
			else {
				fn.notifyErr(msg.client, err);
				return;
			}
		});
}