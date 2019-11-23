/* eslint-disable no-console */
const {handleErr,creative_type} = require("./profile");
const {userTags,marketUserModel} = require("../../util/database");
const {portfolios,creator_types} = require("../../data/config.json").market;
const Sentry = require("../../util/extras");
const Discord = require("discord.js");
const request = require("request");

module.exports = {
	edit: async function(msg, args, doc) {
		return await _edit(msg, args, doc);
	},
	edit_unset: async function (msg, args, doc) {
		return await _edit_unset(msg, args, doc);
	},
	edit_set: async function(msg, args, doc) {
		return await _edit_set(msg, args, doc);
	}
};


async function _edit(msg, args, doc) {
	let core = `\n•    \`${doc.prefix}profile set email <email>\` set your email.\

\n•    \`${doc.prefix}profile set name <name>\` change the preferred name. Defaults to Discord username.\
\n•    \`${doc.prefix}profile set tags <tags>\` replaces current tags with given list. **Comma separated.**\
\n•    \`${doc.prefix}profile set available <true|yes|false|no>\` sets your commissions availability status.\
\n•    \`${doc.prefix}profile set minimum <number>\` sets minimum budgets you work with, in USD.\
\n•    \`${doc.prefix}profile set title <type> [tags]\` sets the creative field type, which determine possible tags. **Comma separated.**\
\n		Optionally change tags right away too. If not given, current tags will be cleared.`;

	let extra = `\n•    \`${doc.prefix}profile set social <number|name> <value>\` sets a social item. \
	\n		See \`${doc.prefix}profile socials\` for list of number/names.\
	\n•    \`${doc.prefix}profile set company-site <url>\` sets the website of the company.\
	\n•    \`${doc.prefix}profile set company <name>\` sets a company you work for.\
	\n•    \`${doc.prefix}profile set description <text>\` Set a 'description' field containing whatever text and formatting. Max 255 chars.\
	\n•    \`${doc.prefix}profile set cover <url|image>\` Add a cover image to be embedded at the bottom of your profile.\
	\n•    \`${doc.prefix}profile set watermark <url|image>\` Custom watermark image. Vote needed. See \`${doc.prefix}profile info watermark\` for info.`;
	
	let remove = `Use \`unset\` instead of \`set\`.\
\n*Examples:*\
\n•    \`${doc.prefix}profile unset email\`\
\n•    \`${doc.prefix}profile unset company-site\`\
\n•    \`${doc.prefix}profile unset social 4\`\
\n•    \`${doc.prefix}profile unset social twitter\``;

	let example = `\`${doc.prefix}profile set name My Name\`\n\`${doc.prefix}profile set 1 My Name\`\n\`${doc.prefix}profile set social 1 myportfolio.com\`\n\`${doc.prefix}profile unset social 1\`\n\`${doc.prefix}profile set title vfx 2d, 3d, intro, outro\``;

	async function e() {
		return new Promise(resolve => {
			const embed = new Discord.RichEmbed()
				.setTimestamp(Date())
				.setColor(process.env.THEME)
				.setFooter(msg.author.tag, msg.author.avatarURL);
			return resolve(embed); 
		});
	}

	let _ = await e();
	_.addField("**[Core] Adding / changing:**", core);

	msg.channel.send(_)
		.then(async ()=>{
			_ = await e();
			_.addField("**[Extras] Adding / changing:**", extra);
			return msg.channel.send(_);
		})
		.then(async ()=>{
			_ = await e();
			_.addField("**Removing:**", remove).addField("**Examples:**", example);
			return msg.channel.send(_);
		}).catch(err=>{throw err;});
}

let rg = {
	site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
	site_image: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?\.(png|webp|jpg|jpeg|gif)$/, "ig"),
	fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
	username: new RegExp(/^[a-zA-Z0-9-_.]+$/, "ig"),
	name_or_username: new RegExp(/^[a-zA-Z0-9-_. ]+$/, "ig"),
	name: new RegExp(/^[a-zA-Z- ]+$/, "ig"),
	email: new RegExp(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/, "i")
};

async function _edit_unset(msg, args, doc) {
	let sub = isValidSub(args[0]);
	if(!args[0]) return msg.channel.send("**Missing argument(s):** You must give the value to set parameter to unset. See `" + doc.prefix + "profile edit` for list of fields.");
	if (!sub) return msg.channel.send("**Invalid argument:** `" + args[0] + "` is not a valid sub-command parameter. See `" + doc.prefix + "profile edit` for list of fields.");
	switch(sub) {
	case 1:
		// name
		update(msg.author.id, {$set:{"name":msg.author.username, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed your displayname, but since it cannot be empy, it's **set to "+msg.author.username+"**.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 2:
		// tags
		userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}}, err => {
			if(err) return handleErr(err, msg);
			return msg.channel.send("**Success:** Removed all of your tags.");
		});
		break;
	case 3:
		// budget
		update(msg.author.id, {$set:{"meta.min_budget":0, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Minimum budget **set to $0**, so it will not show up.");
			}).catch(err=>{return handleErr(err,msg);});
		break;
	case 4:
		// company
		update(msg.author.id, {$set: {"meta.company":null, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed company name. If you have a company URL specified, it will show that instead.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 5:
		// company site
		update(msg.author.id, {$set:{"meta.company_url":null, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed company URL. If you have a company name specified, it will show that instead.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 6:
		// email
		update(msg.author.id, {$set:{"meta.email":null, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Removed your email.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 7:
		// socials
		if (!args[1]) return msg.channel.send("**Missing argument:** You must give which social to remove. See `"+doc.prefix+"profile socials` for list of number/names.");
		else if (valid_social(args[1])) {
			update(msg.author.id, {$unset:{["portfolios."+valid_social(args[1])]:""}, $set:{last_modified:Date()}})
				.then(()=>{
					return msg.channel.send("**Succes:** **"+portfolios[valid_social(args[1].toString())].name+" removed** — if you had it listed.");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** `"+args[1]+"` is not a valid social item. See `"+doc.prefix+"profile socials` for list of number/names.");
		break;
	case 8:
		// Creative field -> Sets to private person, remove tags.
		update(msg.author.id, {$set:{"meta.main_type":5}})
			.then(()=>{
				return userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}});
			}).then(()=>{
				return msg.channel.send("**Success:** Reverted to default of **private person**. Additionally, **any tags you had were removed**.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 9:
		// availability
		update(msg.author.id, {$set:{"meta.available":false, last_modified:Date()}})
			.then(()=>{
				return userTags.updateOne({_id:msg.author.id}, {$set:{available:false}});
			})
			.then(()=>{
				return msg.channel.send("**Success:** Put your availability status to <:Red:642514386497568789>Not available for hire.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 10:
		// image
		update(msg.author.id, {$unset:{"meta.cover_img":false}, $set:{last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Your featured image was removed.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 11:
		// description
		update(msg.author.id, {$set:{"meta.desc":null, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Description field removed.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 12:
		// watermark
		update(msg.author.id, {$set:{"meta.watermark":null, last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Custom watermark removed.");
			}).catch(err=>{return handleErr(err, msg);});
	}
}

async function update(userId, data) {
	return new Promise((resolve,reject) => {
		marketUserModel.updateOne({_id:userId}, data, (err,r) => {
			if(err) return reject(err);
			if(!r.n) {
				Sentry.captureException(new Error(`Profile > edit: User tried to set a field, but DB query found no matches. User: ${userId}, data: ${JSON.stringify(data)}`));
				return reject(new Error("**Could not complete command:** Found no matches for what you specified."));
			}
			return resolve(true);
		});
	});
}

async function update_tags(msg, doc, args) {
	return new Promise((resolve,reject) => {
		marketUserModel.findById(msg.author.id, ["meta.main_type"], (err,user) => {
			if(err)return reject(err);
			if(!user)return resolve({pass:false, data:"**Could not complete command:** It seems your account with me has ceased to exist by the time you reach this point. Try to register. If that doesn't work, submit bug report and/or join support guild."});
			args.shift();
			args = args.join(" ").split(/, +|,/);

			let valid = creator_types[user.meta.main_type].tags.sort();
			let allGood = args.every(v => valid.includes(v.toLowerCase()));
			// console.log(valid, allGood);
			if(allGood) {
				if(args.length<=creator_types[user.meta.main_type.toString()].max_tags) {
					userTags.updateOne({_id:msg.author.id}, {$set:{"tags":args}}, err => {
						if(err) return reject(err);
						return resolve({pass:true, data:"**Success:** You can now be found if anyone search for someone that does one of the following: "+args.join(", ")+"."});
						//TODO: If using last_updated, I need to update marketUserModel too: update(msg.author.id, {$set:last_update:Date()})
					});
				} else return resolve({pass:false, data:"**Too many arguments:** You exceeded the max amount of tags possible for your creative field. The **max is "+creator_types[user.meta.main_type.toString()].max_tags+"**, while **you used "+args.length+"**."});
			} else {
				let invalid = args.filter(v=>!valid.includes(v.toLowerCase()));
				return resolve({pass:false, data:"**Invalid argument(s):** One or more of the tags you listed were not valid for your group: **`"+invalid.join(", ")+"`**. See `"+doc.prefix+"profile tags` for list of all tags.\n*Make sure the list of tags is separated by comma.*"});
			}
		});
	});
}

async function _edit_set(msg, args, doc) {
	if(!args.length) return msg.channel.send("**Missing arguments:** You must give me a field and a value to update.\n*See `"+doc.prefix+"profile edit` for list of names of fields.*");
	let sub = isValidSub(args[0]);
	if(!sub) return msg.channel.send("**Invalid argument:** `"+args[0]+"` is not a valid sub-command parameter.\n*See `"+doc.prefix+"profile edit` for list of names of fields.*");
	if (!args[1]) return msg.channel.send("**Missing argument(s):** You must give the value to set " + isValidSub(args[0],true) + " to as well.");
	switch(sub) {
	case 1:
		// name
		if(args.slice(1).join(" ").length<40) {
			update(msg.author.id, {$set:{name:args.slice(1).join(" "), last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Changed your display name to "+args.slice(1).join(" ")+".");
				})
				.catch(err => {
					return handleErr(err, msg);
				});
		} else return msg.channel.send("**Invalid argument:** `"+args.slice(1).join(" ")+"` is way too long of a name.");
		break;
	case 2:
		// tags -> Requires to check amount, and if it fits the meta.main_type, as well as instead change the userTags model
		update_tags(msg, doc, args)
			.then(r=>{
				return msg.channel.send(r.data);
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 3:
		// budget
		args[1].replace(/(usd)|[$]/ig, "");
		if(isNaN(args[1])) {
			return msg.channel.send("**Invalid argument:** Where you said `"+args[1]+"`, you **must instead use a whole number** that will be listed as USD.");
		} else {
			try {
				args[1] = parseInt(args[1]);
			} catch(err) {
				return msg.channel.send("**Invalid argument:** Where you said `"+args[1]+"`, you **must instead use a whole number** that will be listed as USD.");
			}
			update(msg.author.id, {$set:{"meta.min_budget":args[1], last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** You now advertise working with a **minimum budget of $"+args[1]+"**.");
				})
				.catch(err =>{return handleErr(err, msg);});
		}
		break;
	case 4:
		// company
		args.shift();
		if(args.join(" ").length<40) {
			update(msg.author.id, {$set:{"meta.company":args.join(" "), last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Now showing that you work at "+args.join(" ")+".");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** The **company name is too long**. That can't be right, can it? Sounds like someone made a poor decision.");
		break;
	case 5:
		// company site
		if(rg.site.test(args[1]) && args[1].length<40) {
			args[1] = (/^https?:\/\//.test(args[1]))?args[1]:"https://"+args[1]; // Append https protocol if none set.
			update(msg.author.id, {$set:{"meta.company_url":args[1], last_updated:Date()}})
				.then(()=>{
					return msg.channel.send("**Success:** Now linking your company at the URL `"+args[1]+"`.");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** Either your link is really long *(40+ chars)*, or it does not conform to common link formats.");
		break;
	case 6:
		// email
		if(rg.email.test(args[1])) {
			update(msg.author.id, {$set:{"meta.email":args[1]}, last_updated:Date()})
				.then(()=>{
					return msg.channel.send("**Success:** Now showing your e-mail: " + args[1] + ".");
				}).catch(err=>{return handleErr(err, msg);});
		} else return msg.channel.send("**Invalid argument:** Either your e-mail does not comform to common format, or it is too long *(40+ chars)*.");
		break;
	case 7:
		// socials
		if (valid_social(args[1])) {
			if(args.length===2) return msg.channel.send("**Missing argument:** You must give me input on what to set **"+valid_social(args[1], true)+"** to.");
			///////////////////////////////////
			let num = valid_social(args[1]);
			args = args.slice(2).join(" ");

			let rg = {
				site: new RegExp(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/, "ig"),
				fb: new RegExp(/^(https?:\/\/)?(www\.)?facebook\.com(\/\S*)?$/, "ig"),
				username: new RegExp(/^[a-zA-Z0-9-_. ]+$/, "ig")
			};
			switch (parseInt(num)) {
			case 1:
				// Type: site
				args = (/^https?:\/\//i.test(args))?args:"https://"+args;
				if(!rg.site.test(args)) return msg.channel.send("**Invalid argument:** The input after the number did not match that of a valid website URL. Try again.");
				else {
					// num = key, args = value
					update(msg.author.id, {$set:{[`portfolios.${num}`]:args, last_updated:Date()}})
						.then(()=>{
							return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: `"+portfolios[num.toString()].prefix+args+"`.");
						}).catch(err=>{return handleErr(err, msg);});
				}
				break;
			case 8:
				// Type: facebook
				args = (/^https?:\/\//i.test(args))?args:"https://"+args;
				if(!rg.fb.test(args)) return msg.channel.send("**Invalid argument:** The input after the number **did not match** that of a valid **Facebook URL**. Try again.");
				else {
					// num = key, args = value
					update(msg.author.id, {$set:{[`portfolios.${num}`]:args, last_updated:Date()}})
						.then(()=>{
							return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: `"+portfolios[num.toString()].prefix+args+"`.");
						}).catch(err=>{return handleErr(err, msg);});
				}
				break;
			default:
				// All other is of type username
				args = args.replace("@", "");

				// Test matching URL, meaning the latter reg determine if URL or username
				// if(rg.username.test(args)) return {pass:true, data:args, type:num};
				
				if (!rg.site.test(args) && !/\//g.test(args)) {
					let usr = args.split("/");
					usr = usr[usr.length-1];
					if(usr.length && rg.username.test(usr)) {
						// num = key, args = value
						update(msg.author.id, {$set:{[`portfolios.${num}`]:args, last_updated:Date()}})
							.then(()=>{
								return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: "+portfolios[num.toString()].prefix+args+".");
							}).catch(err=>{return handleErr(err, msg);});
					} else return msg.channel.send("**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again.");
				} else {
					args = args.split("/");
					let username = args[args.length-1];
					if(rg.username.test(username)) {
						update(msg.author.id, {$set:{[`portfolios.${num}`]:username}})
							.then(()=>{
								return msg.channel.send("**Success:** Social item **"+portfolios[num.toString()].name+"** updated to: "+portfolios[num.toString()].prefix+username+".\
								\n*If this was wrong, input your username again without URL.*");
							}).catch(err=>{return handleErr(err, msg);});
					} else {
						return msg.channel.send("**Invalid argument:** The username includes invalid characters. Remove invalid symbols and try again.");
					}
				}
			}
			/////////////////////////////////////
		} else return msg.channel.send("**Invalid argument:** "+args[1]+" is not a valid social item. See `"+doc.prefix+"profile socials` for a list of socail numbers/names.");
		break;
	case 8:
		// Creative field
		if (await creative_type(args[1])) {
			// return;
			let type = await creative_type(args[1]);
			update(msg.author.id, {$set:{"meta.main_type":type, last_updated:Date()}})
				.then(()=>{
					if(args.length>2) {
						// Test if tags are valid, and if exceeds limnit. Perform setting.
						return update_tags(msg, doc, args.slice(1));
					} else {
						// No tags were present, so just remove them.
						return userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}});
					}
				})
				.then(r => {
					if(args.length>2) {
						if(r.pass) {
							// All went well, updating title and tags.
							return msg.channel.send("**Title - success:** Your new title is **" + creator_types[type].name + "**.\
							\n**Tags - success:** All of your tags were also updated: `"+args.slice(2).join(" ").split(/, +|,/).join("`, `")+"`");
						} else {
							// Title set, but tags had failure.
							userTags.updateOne({_id:msg.author.id}, {$set:{tags:null}}, err =>{
								if(err) return handleErr(err, msg);
								// Since tags failed, remove them.
								return msg.channel.send("**Title - success:** Your new title is **" + creator_types[type].name + "**.\
								\n**Tags: — failed:**"+r.data.slice(24)+"\
								\n**As a result:** all of your tags were removed. You can set new tags with `" + doc.prefix + "profile set tags <tags>`, or see possible ones first with `" + doc.prefix + "profile tags`.");
							});
						}
					} else {
						// All went well setting title, but user did not specify tags.
						return msg.channel.send("**Success:** Your new title is **" + creator_types[type].name + "**, but your tags were removed as you changed field.\
						\nYou can set new tags with `" + doc.prefix + "profile set tags <tags>`, or see possible ones first with `" + doc.prefix + "profile tags`.");
					}
				})
				.catch(err=>{
					console.error(err);
					// return handleErr(err, msg);
				});
		} else return msg.channel.send("**Invalid input:** The creative field `"+args[1]+"` is not one I consider valid. See `"+doc.prefix+"profile fields` for a list of creative fields numbers/names.");
		break;
	case 9:
		// available
		switch(args[1].toLowerCase()) {
		case "y":
		case 1:
		case "true":
		case "yes":
		case "open":
			args[1] = true;
			break;
		default:
			args[1] = false;
		}
		update(msg.author.id, {$set:{"meta.available":args[1], last_modified:Date()}})
			.then(()=>{
				return userTags.updateOne({_id:msg.author.id}, {$set:{available:args[1]}});
			})
			.then(()=>{
				return msg.channel.send(`**Success:** Put your availability status to${args[1]?"<:Green:642514515514228736>Open for commissions.":"<:Red:642514386497568789>Not available for hire."}`);
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 10:
		// cover image
		if(!/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/ig.test(args[1])) return msg.channel.send("**Invalid argument:** `"+args[1]+"` is not a valid common link scheme.");
		if (/\?/ig.test(args[1])) args[1] = args[1].split("?")[0]; // Remove querystring.
		if (!/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?\.(png|webp|jpg|jpeg|gif)$/ig.test(args[1])) return msg.channel.send("**Invalid argument:** Your link ends with `" + args[1].split("/")[args[1].split("/").length - 1] + "`, which is not a format I can use.\nStick to `.png`, `.jpg`, `.jpeg`, `.gif`, or `.webp`");
		update(msg.author.id, {$set:{"meta.cover_img":args[1], last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Your featured image was set to `"+args[1]+"`.\n*Note: If you control the host, you can update the image itself instead of setting a new one — though Discord will most likely cache it.*");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 11:
		args.shift();
		if(args.join(" ").length>255) return msg.channel.send(`**Invalid input:** Your description exceeds the maximum of 255 by **${args.join(" ").length-255}** characters.`);
		update(msg.author.id, {$set:{"meta.desc":args.join(" "), last_modified:Date()}})
			.then(()=>{
				return msg.channel.send("**Success:** Your description was set.");
			}).catch(err=>{return handleErr(err, msg);});
		break;
	case 12:
		// watermark
		if (!/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/ig.test(args[1])) return msg.channel.send("**Invalid argument:** `" + args[1] + "` is not a valid common link scheme.");
		if (/\?/ig.test(args[1])) args[1] = args[1].split("?")[0]; // Remove querystring.
		if (!/^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?\.png$/ig.test(args[1])) return msg.channel.send("**Invalid argument:** Your link ends with `" + args[1].split("/")[args[1].split("/").length - 1] + "`, which is not a format I can use.\nStick to `.png`");
		request.patch({url:`${process.env.NEW_API}${process.env.API_VERSION}/profile/watermark`, form:{user:msg.author.id, url:args[1]}}, (err,res,body) => {
			if (err) return handleErr(err, msg);
			try {
				body = JSON.parse(body);
			} catch(_) {
				return handleErr(err, msg, "**Error:** API responded with something unexpected. Incident logged.");
			}
			return msg.channel.send(body.message);
		});
		break;
	}
}

/**
 * Checks if input is any valid sub-field you can edit
 * @param {String|Number} input A single input to check
 * @param {Boolean} [name=false] Use input to return the name of the field instead
 * @returns {Number} The number type, 0 if no match
 */
function isValidSub(input, name=false) {
	if(!input) return 0;
	switch (input.toLowerCase()) {
	case "1":
	case 1:
	case "one":
	case "name":
	case "display":
		return (name)?"name":1;
	case "2":
	case 2:
	case "two":
	case "tag":
	case "tags":
	case "type":
	case "types":
		return (name)?"tag(s)":2;
	case "3":
	case 3:
	case "three":
	case "budget":
	case "min":
	case "minimum":		
		return (name)?"budget":3;
	case "4":
	case 4:
	case "four":
	case "company":
		return (name)?"company name":4;
	case "5":
	case 5:
	case "five":
	case "site":
	case "url":
	case "website":
	case "company-site":
	case "company-url":
		return (name)?"company site":5;
	case "6":
	case 6:
	case "six":
	case "email":
	case "e-mail":
	case "mail":
		return (name)?"e-mail":6;
	case "7":
	case 7:
	case "seven":
	case "social":
	case "socials":
	case "portfolio":
		return (name)?"social item":7;
	case "8":
	case 8:
	case "eight":
	case "title":
	case "field":
	case "creative":
		return (name)?"creative field":8;
	case "9":
	case 9:
	case "nine":
	case "available":
	case "commissions":
	case "open":
		return (name)?"open for commissions status":9;
	case "10":
	case 10:
	case "ten":
	case "image":
	case "cover":
	case "img":
		return (name)?"image":10;
	case "11":
	case 11:
	case "elleven":
	case "bio":
	case "desc":
	case "about":
	case "description":
		return (name)?"desc":11;
	case "12":
	case 12:
	case "twelve":
	case "wm":
	case "watermark":
		return (name)?"watermark":12;
	default:
		return 0;
	}
}


/**
 * Checks if input is valid social type
 * @param {String|Number} input Any single input.
 * @param {Boolean} [name=false] To return a name of the input instead.
 * @returns {Number} The creative field number, 0 if no match
 */
function valid_social(input, name=false) {
	if(!input) return 0;
	input = input.toLowerCase();
	let i=0;
	for(let port in portfolios) {
		i++;
		if(portfolios[port].synonyms.includes(input)) return (name)?portfolios[port].name:i;
	}
	switch(input) {
	case "one":
	case "1":
	case 1:
		return (name)?portfolios[1].name:1;
	case "two":
	case "2":
	case 2:
		return (name)?portfolios[2].name:2;
	case "three":
	case "3":
	case 3:
		return (name)?portfolios[3].name:3;
	case "four":
	case "4":
	case 4:
		return (name)?portfolios[4].name:4;
	case "five":
	case "5":
	case 5:
		return (name)?portfolios[5].name:5;
	case "six":
	case "6":
	case 6:
		return (name)?portfolios[6].name:6;
	case "seven":
	case "7":
	case 7:
		return (name)?portfolios[7].name:7;
	case "eight":
	case "8":
	case 8:
		return (name)?portfolios[8].name:8;
	default:
		return 0;
	}
}


/**
 * Returns a list of numbers/names of editable main fields
 * @returns {String} Neatly formatted string of field numbers and names
 */
async function fields_list() {
	let response = "\n<:One:588844523329683476> Display name | `name`, `display`\
		\n<:Two:588844524659540030> Tags | `tag`|`tags`|`type`|`types`\
		\n<:Three:588844524659539972> Minimum budgets | `budget`|`min`|`minimum`\
		\n<:Four:588844515520020598> Company name | `company`\
		\n<:Five:588844516283252736> Company website | `site`|`company-site`|`company-url`\
		\n<:Six:588844524332384276> E-mail | `email`\
		\n<:Seven:588844523938119680> Social media and portfolio's | `social`|`socials`|`portfolio`\
		\n<:Eight:588844512286343179> Creative field / title | `title`|`field`|`creative`\
		\n<:Eight:588844512286343179> Image | `image`|`img`|`cover`";
	return response;
}