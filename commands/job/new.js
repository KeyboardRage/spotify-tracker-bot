const {dmAndAwait,findUser,counter_number,formatTime} = require("../../util/command-utilities");
const fn = require("../../util/response_functions");
const invite = "https://discord.gg/SEssczu";
const Discord = require("discord.js");
const Sentry = require("../../util/extras");
const {RedisDB,lock,unlock} = require("../../util/redis");
const {guildJobs,jobsModel,marketEvents,marketUserModel} = require("../../util/database");
const {event,makeNewUser,checkMax} = require("./minors");
const flags = require("./flags.json");

module.exports = init;

async function init(msg, args, doc) {
	// new <user>
	//TODO: Insert new counters to coutners model: marketReviews, marketReports, marketJobs, marketEvents

	let n = await checkMax(msg.author.id);
	if(parseInt(n)>=10) return msg.channel.send("**Denied:** You already have 10 open deals. Finish some of them before making more.").catch(err=>{console.error(err);});
	let meta = {
		step: 0,
		id: msg.author.id,
		username: msg.author.tag,
		data: Object(),
		target: null,
		message: msg.content,
		guild: msg.guild.id,
		guild_name: msg.guild.name,
	};
	let stop=false;
	lock(msg.author.id, "job")
		.then(() => {
			return findUser(msg.client, args[1], {inGuild:msg.guild.id, msg:msg, onlyId:true});
		})
		.then(async r => {
			if(!r) {
				stop=true;
				msg.channel.send("**Could not initiate:** I could not find the user you specified.");
				unlock(msg.author.id, "job");
				return;
			}
			if(r===msg.author.id) {
				stop=true;
				msg.channel.send("**Aborted:** You cannot create a job with yourself as the buyer.");
				unlock(msg.author.id, "job");
				return;
			}
			meta.target = r;
			n = await checkMax(r);
			if(parseInt(n)>=10) {
				stop=true;
				msg.channel.send("**:warning: Aborted:** The buyer already has 10 deals open at this moment, and is not allowed to accept more.");
				unlock(msg.author.id, "job");
				return;
			}
			return checkIfExist(msg.author.id, meta.target);
		})
		.then(r => {
			if(stop) return;
			if(!r.pass) {
				stop=true;
				msg.channel.send("**Denied:** You already have a job with this user, created at "+formatTime(r.data.created)+".\
				\n•    You may only have one concurrent job case per user at once.\
				\n•    If you need to make changes to the job, use `"+doc.prefix+"job edit "+r.data._id+"`.\
				\n•    Abort or finish job case with `"+doc.prefix+"job abort "+r.data._id+"` or `"+doc.prefix+"job done "+r.data._id+"` if it's a new un-related job.");
				return unlock(msg.author.id, "job");
			}
			return marketUserModel.findOne({_id:meta.target});
		})
		.then(r => {
			if(stop) return;
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(`New job case with ${meta.target}`, msg.author.avatarURL)
				.addField("<:Grafik:588847763341705263> **New job**", `New job with <@${meta.target}> ${r && r.name?"("+r.name+") ":""}as the buyer.\n*Say \`abort\` at any point through this process to abort. \
Everything you input can be changed later, but require mutual agreement. After 2 minutes of no response, process will be aborted.*`, true);
			if(r) {
				embed.addField("**Buyer details:**", `Additionally, here are some details about the buyer I already had:\n**Deals open:** ${r.open?r.open.length:0}\n**Reports:** ${r.reports?r.reports.length:0}\n**Reviews:** ${r.reviews?r.reviews.length:0}\n**Completed sales:** ${r.sales?r.sales:0}\n**Completed purchases:** ${r.purchases?r.purchases:0}\nTo view the user's profile in detail, \`abort\` and then use \`+profile ${meta.target}\` — or check later.`, true);
				let warning = "";
				if (r.reports && r.reports.length >= 2) {
					warning += "\n:warning: Buyer has multiple reports on them. To inspect, say `abort` then use `+profile reports " + meta.target + "`.";
				}
				if (r.open && r.open.length >= 2) {
					warning += "\n:warning: Buyer already has multiple deals open at this moment. To inspect, say `abort` then use `+profile open " + meta.target + "`.";
				}
				if (warning.length) {
					embed.addField("**Warnings:**", warning);
				}
				
			}
			embed.addField("**Payment:**", "Is there an agreed payment for this job?\
\n**Reply with…**\
\n• `no` No payment agreed upon.\
\n• `<message>` An amount or arbitrary payment");
			return send(msg, args, doc, embed, catch_sum, meta);
		})
		.catch(err=>{
			console.log(err);
			unlock(msg.author.id, "job");
			return handleErr(err, msg, meta, "**Error:** Could not look for user. Incident logged. Make a `+bug <message>` report if problem persists, or join support guild: " + invite);
		});
}

async function handleErr(err, msg, meta, response=null) {
	console.error(err);
	unlock(msg.author.id, "job");
	if(response) {
		msg.author.send(response);
		return fn.notifyErr(msg.client, new Error("ERROR @ New job: "+JSON.stringify(meta)+"\n"+err.toString()));
	} else {
		msg.author.send("**Error:** An unknown error occurred, and process has been aborted. Incident logged.\nMake a `+bug <message>` report if problem persists, or join support guild: " + invite);
		return fn.notifyErr(msg.client, new Error("ERROR @ New job: "+JSON.stringify(meta)+"\n"+err.toString()));
	}
}

async function send(msg, args, doc, response, callback, meta) {
	dmAndAwait(msg.author, response)
		.then(r => {
			if(r.toLowerCase()==="abort") return abortJob(msg, doc, meta);
			console.log(r);
			meta.totalSteps++;
			meta.message = r;
			console.log(r.trim().split(" "));
			return callback(msg, r.trim().split(" "), doc, meta);
		})
		.catch(err=>{
			if (err.size === 0) return msg.author.send("**Aborted:** Two minutes have passed. Timed out waiting for a response. Job creation was aborted.");
			else return handleErr(err, msg, meta);
		});
}

async function abortJob(msg, doc, meta) {
	unlock(msg.author.id, "job");
	return msg.author.send("**Aborted.**");
}

async function catch_sum(msg, args, doc, meta) {
	// none = null, sum = number, 
	meta.step=1;
	meta.data.payment = args[0].toLowerCase()==="no"?null:isNaN(args[0])?args.join(" "):parseInt(args[0]);
	
	let string = `<:Grafik:588847763341705263> **New job — Buyer: <@${meta.target}>**\
	\n**Brief:** reply with the complete brief for the job.`;

	return send(msg, args, doc, string, catch_brief, meta);
}

async function catch_brief(msg, args, doc, meta) {
	meta.step=2;
	meta.data.brief = args.join(" ");

	let string = `<:Grafik:588847763341705263> **New job — Buyer: <@${meta.target}>**\
	\n**Deadline:** Is there an agreed upon deadline?\
	\n**Reply with…**\
	\n• \`no\` No deadline has been set.\
	\n• \`<message>\` The deadline if any.`;

	return send(msg, args, doc, string, catch_deadline, meta);
}

async function catch_deadline(msg, args, doc, meta) {
	meta.step=3;
	meta.data.deadline = args[0].toLowerCase()==="no"?null:args.join(" ");

	// Generate job ID
	meta.job = await counter_number("marketJobs").catch(err => {handleErr(err, msg, meta);});

	let date = Date();
	let mongoose = require("mongoose");
	let market_event_id = mongoose.Types.ObjectId();
	let _seller = Object();

	// New event: opened.
	let newEvent = new marketEvents({
		_id: market_event_id,
		guild: msg.guild.id,
		job: meta.job,
		user: meta.id,
		hidden: false,
		content: meta.target+" hired "+meta.target+" for a new job "+meta.job,
		created: date,
		files: null
	});

	// Save an open case
	let job = new jobsModel({
		_id: meta.job,
		user: meta.id,
		target: meta.target,
		flags: 0,
		guild: msg.guild.id,
		last_updated: date,
		created: date,
		finished: null,
		meta: {
			deadline: meta.data.deadline,
			payment: meta.data.payment,
			brief: meta.data.brief
		},
		events: [market_event_id]
	});

	job.save()
		.then(()=>{
			meta.step=4;
			RedisDB.incr("jobs:open:"+msg.author.id);
			return newEvent.save();
		})
		.then(()=>{
			meta.step = 5;
			return guildJobs.findOne({_id:msg.guild.id});
		})
		.then(d => {
			meta.step = 6;
			if(!d) {
				let guild = new guildJobs({
					_id: msg.guild.id,
					last_job_date: date,
					last_job: meta.job,
					jobs_open: 1,
					jobs_completed: 0,
					jobs_aborted: 0,
					jobs_reported: 0,
					notify: null,
					total_jobs_created: 1
				});
				return guild.save();
			} else {
				if (d.notify) notifyGuild(msg, meta, d.notify);
				d.last_job = meta.job;
				d.last_job_date = date;
				d.total_jobs_created++;
				d.jobs_open++;
				return d.save();
			}
		})
		.then(() => {
			meta.step = 7;
			return marketUserModel.findOne({_id:meta.id});
		})
		.then(async d => {
			meta.step = 8;
			if(!d) {
				meta.unknown = true;
				let usr = await makeNewUser(meta, msg, date);
				_seller = usr.toObject();
				return usr.save();
			} else {
				meta.unknown = false;
				d.last_updated = date,
				d.meta.discord = msg.author.username,
				d.meta.discriminator = msg.author.discriminator,
				d.open = [...d.open, meta.job],
				d.jobs = [...d.jobs, meta.job];
				_seller = d.toObject();
				return d.save();
			}
		})
		.then(()=>{
			meta.step = 9;
			return msg.client.fetchUser(meta.target);
		})
		.then(user => {
			meta.step = 10;

			let string = String();
			if(meta.unknown) {
				string = "The seller is new to me so I have no data on previous sales and whatnot. They were not registered, so I created the profile automatically.";
				string += `\nAlthough it's not much, you can view the user's profile in detail with \`+profile ${meta.id}\``;
			} else {
				let warning = "";
				if (_seller.reports.length >= 2) {
					warning += ":warning: Seller has multiple reports on them. To inspect, say `abort` then use `+profile reports " + _seller._id + "`.\n";
				}
				if (_seller.open.length >= 2) {
					warning += ":warning: Seller already has multiple deals open at this moment. To inspect, say `abort` then use `+profile open " + _seller._id + "`.\n";
				}

				string = `${warning}**Deals open:** ${_seller.open?_seller.open.length:0}\n**Reports:** ${_seller.reports?_seller.reports.length:0}\n**Reviews:** ${_seller.reviews?_seller.reviews.length:0}\n**Completed sales:** ${_seller.sales?_seller.sales:0}\n**Completed purchases:** ${_seller.purchases?_seller.purchases:0}`;
				string+=`\nTo view the user's profile in detail, use \`+profile ${meta.id}\``;
				if(_seller.jobs.length>1) {
					string += `\nTo view details on on any of the fields above, use \`+profile ${meta.id} <field>\` where \`field\` is an item above.`;
				}
			}
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(`New job case: ${meta.job}`, msg.client.user.avatarURL)
				.setThumbnail(msg.author.avatarURL)
				.addField(`<:Grafik:588847763341705263> **Did you hire ${meta.username}?**`, `**If you did,** you need to use \`+job accept ${meta.job}\` here within 24 hours *(or \`${doc.prefix}job accept ${meta.job}\` in ${msg.guild.name})*.\
				\n**If not, or you disagree with the details of the job,** use \`+job decline ${meta.job}\`. I'll notify the seller, but you will have confront the seller about the eventual details as to *why*.`)
				.addField("**What's next for you?**", "I will try to notify the seller with your response. After that all there is to do is wait on the seller. Meanwhile though, you could familiarize yourself with commands specific to a job: `+job cmds case`")
				.addField("**Seller details:**", string, true)
				.addField("**Brief details:**", `**Agreed payment:** ${meta.data.payment}\n**Deadline:** ${meta.data.deadline?meta.data.deadline:"None set"}\n**Brief:** ${meta.data.brief}`);
			return user.send(`<:Add:588844511489425408> **New job — Buyer: <@${meta.id}>**:`, {embed});
		})
		.then(()=>{
			meta.step = 11;
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(`New job case: ${meta.job}`, msg.client.user.avatarURL)
				.setThumbnail(msg.author.avatarURL)
				.addField("<:Grafik:588847763341705263> **Thank you**", `A new job with the **id \`${meta.job}\`** with <@${meta.target}> set as the buyer has been created.`)
				.addField("**Some information:**", `• The job will be open for accepting for 24 hours. After that it is aborted.\
				\n• I successdully DM'd the buyer to accept the job. They will have to do \`${doc.prefix}job accept ${meta.job}\`${process.env.PREFIX!==doc.prefix?"*(in DM's my prefix is **`+`**)*":""}\
				\n• When buyer accepts, I will try to notify you.`)
				.addField("**What do you need to do next?**", "There's nothing you *must* do now but wait on the buyer. What you *could* do though is familiarize yourself with commands specific to a job: `"+process.env.PREFIX+"job cmds case`");
			return msg.author.send(embed);
		})
		.then(()=>{
			meta.step = 12;
			unlock(msg.author.id, "job");
			return event(meta, `Successfully DM'd buyer ${meta.target} to accept the job, and informed seller ${meta.id} of it.`);
		})
		.catch(err=>{
			unlock(msg.author.id, "job");
			console.error(err);
			if([9,10,11].includes(meta.step)) return failover(err, msg, doc, meta);	
			else {
				Sentry.captureException(new Error("ERROR @ new job > Error in DB chain! " + JSON.stringify(meta) + "\n" + err.toString()));
				return handleErr(err, msg, meta, "**Error:** Could not save new job listing. Incident logged. Make a `+bug <message>` report if problem persists, or join support guild: " + invite);
			}
		});
}

async function failover(err, msg, doc, meta) {
	if (meta.step === 9) {
		// Could not find user.
		msg.author.send("**… it seems I am now unable to fetch your buyer.** Did they leave the guild?\nThe job is still open, and can still be operated on as normal, but you may want to notify the buyer to accept the job.");
		return event(meta, `Unable to fetch buyer ${meta.target} and notify them. Possibility they left the guild while the job was created.`);
	}

	if (meta.step === 10) {
		// Error is probably couldn't DM user.
		event(meta, `Unable to notify buyer ${meta.target}. ${err.hasOwnProperty("code")?"Error code: "+err.code:"Generic error."}${err.hasOwnProperty("code")&&err.code===5007?". Most likely means user has DM's disabled.":""} Attempting to tag in job creation channel.`)
			.then(()=>{
				return msg.channel.send(`<@${meta.target}> I tried to DM you *(and failed)* about a new job you're associated with, **created by ${meta.username}**.\nYou have 24 hours to accept it: \`${doc.prefix}job accept ${meta.job}\`.`);
			})
			.then(()=>{
				return event(meta, `Successfully tagged buyer ${meta.target} in channel ${msg.channel.name} (${msg.channel.id}).`);
			})
			.catch(err=>{
				console.error(err);

				if (err.hasOwnProperty("code") && err.code === 50013) event(meta, `Unable to tag buyer ${meta.target} in channel. Missing permissions to write in it.`);
				else event(meta, `Unknown error after attempting to DM buyer ${meta.target}.`);

				let string = "I couldn't DM nor tag the buyer in the channel you initiated the command in.";
				if(err.hasOwnProperty("code") && err.code===50013) string+="\n**Reason:** I do not have permissions to write in that channel. You may want to let staff know about that issue.";
				string += "\nYou must notify them to accept the job yourself.";

				return msg.author.send(string);
			});
	}
}

async function notifyGuild(msg, meta, channel) {
	const embed = new Discord.RichEmbed()
		.setTimestamp(Date())
		.setColor(process.env.THEME)
		.setFooter(msg.author.tag, msg.author.avatarURL)
		.addField("**New job created**", `<@${meta.target}> hired <@${meta.id}> for a new job. Job case ID is **\`${meta.job}\`**.`);
	msg.guild.channels.get(channel).send(embed)
		.then(m => {
			return jobsModel.updateOne({_id:meta.job}, {$set:{notification:`${m.channel.id}:${m.message.id}`}});
		})
		.catch(err => {
			if(err.code && err.code===50013) return;
			return fn.notifyErr(msg.client, err);
		});
}

async function checkIfExist(user,target) {
	/**
	 * Restrictions:
	 * 1 per 1 user, no matter guild
	 * Exclude jobs completed
	 * Exclude jobs aborted
	 * 
	 * Flags: if it finds one after exluding completed/aborted, then stop.
	 */
	return new Promise((resolve,reject) => {
		jobsModel.findOne({$or:[{user:user}, {target:target},{user:target}, {target:user}], flags:{$bitsAnyClear:flags.job.completed|flags.job.aborted|flags.job.declined}}, ["_id","created"], (err,doc) => {
			if(err) return reject(err);
			console.log(doc);
			if(doc) return resolve({pass:false, data:doc});
			return resolve({pass:true});
		});
	});
}
