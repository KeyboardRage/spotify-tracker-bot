const ACCESS = require("../data/permissions.json");
const Lipsum = require("node-lipsum"),
	lipsum = new Lipsum();
const Discord = require("discord.js");

module.exports = {
	cmd: "lipsum",
	aliases: ["dummytext"],
	cooldown: {min: 3},
	permissionLevel: ACCESS.user,
	dm: true,
	daccess: [""],
	desc: "Generates 'Lorem Ipsum' dummy text based on options/default.",
	async exec(msg, cmg, args) {
		let options = {
			start: "yes",
			what: "paragraphs",
			amount: 1
		};
		if(args.length) {
			for(let i=0;i<args.length;i++) {
				if(args[i]==="--false") options.start = "no";
				else if(!isNaN(args[i])) options.amount = parseInt(args[i]);
				else {
					switch(args[i]) {
					case "paragraph":
					case "paragraphs":
					case "sentences":
					case "sentence":
						options.what = "paragraphs";break;
					case "word":
					case "words":
						options.what = "words";break;
					case "byte":
					case "bytes":
						options.what = "bytes";break;
					case "list":
					case "items":
					case "lists":
						options.what = "lists";break;
					}
				}
			}
		}

		/**Options:
		 * what:
		 * 	- bytes
		 * 	- paragraphs
		 * 	- words
		 *  - lists
		 * start:
		 *  - "yes"
		 *  - "no"
		 */
		try {
			lipsum.getText(text => {
				try {
					return msg.author.send("```"+text+"```");
				} catch(_) {
					return msg.channel.send("```" + text + "```");
				}
			}, options);
		} catch(err) {
			msg.channel.send("**Error:** An error ocurred trying to generate the dummytext. The incident has been reported.");
			throw err;
		}
	},
	help(msg, cmd, args, doc) {
		(this.aliases.includes(this.cmd)) ? null: this.aliases.unshift(this.cmd);
		const embed = new Discord.RichEmbed()
			.setTimestamp(Date())
			.setColor(process.env.THEME)
			.setFooter(msg.author.tag, msg.author.avatarURL)
			.addField("Description", this.desc, true)
			.addField("Meta", `Can be used in DM: **${(this.dm)?"Yes":"No"}** — Cooldown: **${this.cooldown.min} sec**`, true)
			.addField("Aliases", `${this.aliases.join(", ")}`, true)
			.addField("Usage", `\`${doc.prefix}${this.cmd} <text>\``)
			.addField("Arguments", "**Default:**\n`1 paragraph` One paragraph, starting with 'Lorem ipsum…'.\
			\n\n**Available:**\
			\n`\"--false\"` Don't start with 'Lorem ipsum…'\
			\n`\"bytes\"`, `\"paragraphs\"`, `\"lists\"`, `\"words\"` The type of the amount\
			\n`#` Number for the type")
			.addField("Examples", `\`${doc.prefix}${this.cmd}\`\n\`${doc.prefix}${this.cmd} 20 bytes\`\n\`${doc.prefix}${this.cmd} paragraphs 3 --false\`\n\`${doc.prefix}${this.cmd} --false 30 words\`\n`);
		msg.channel.send(embed);
	}
};
