const CommandUtility = require("./CommandUtility");
const config = require("../../config");

/**
 * Represents a Spotify-tracker command
 */
module.exports = class Command {
	/**
	 * Creates a new Command
	 * @param {String} filepath The filepath to the command file
	 * @param {String} label The main command name
	 * @param {Object} meta Any metadata for this command
	 * @param {Function} executor The function that will be executed
	 */
	constructor(filepath, label, meta, executor) {
		if (!label) throw new Error("A command label is mandatory");
		if (!meta) throw new Error("Command metadata is mandatory");
		if (!executor) throw new Error("Command execution function is mandatory");

		/**
		 * The path to the current command's file
		 * @prop {String} filepath
		 */
		this.filepath = filepath;
		if (!filepath || typeof (filepath) !== "string") throw new Error("Missing or wrong type for 'filepath'");

		/**
		 * The main command name
		 * @prop {String} label
		 */
		this.label = label;
		if (typeof(this.label)!=="string") throw new Error(`Label must be a string, got ${this.label.constructor.name}`);


		/**
		 * Aliases for the command
		 * @prop {Array<String>} aliases
		 */
		this.aliases = meta.aliases||[];
		if (!this.aliases.includes(this.label)) this.aliases.unshift(this.label);

		/**
		 * A short description of this command
		 * @prop {String} desc
		 */
		this.desc = meta.desc;
		if (!this.desc || typeof(this.desc)!=="string") {
			throw new Error(`Description is missing for '${this.label}'`)
		} else if (this.desc.length > 65) {
			throw new Error(`The description for '${this.label}' is too long. Stick to something around 30 characters (60 max)`)
		}

		/**
		 * The function to execute when command is invoked
		 * @prop {Function} exec
		 */
		this.exec = executor;
		if (typeof(this.exec)!=="function") throw new Error(`Executor most be a function, got ${this.exec.constructor.name}`);

		/**
		 * The permissions needed to use this command
		 * @prop {Number} permission
		 */
		this.permission = meta.permission||config.ACCESS.user;

		/**
		 * Syntax for this command
		 * @prop {String} syntax
		 */
		this.syntax = meta.syntax||this.label;

		/**
		 * An array of sub-commands and brief description of them
		 * @prop {Array<Object>} subcommands
		 */
		this.subcommands = meta.subcommands||[];

		/**
		 * A list of example useage
		 * @prop {Array<String>}
		 */
		this.examples = meta.examples||[this.label];

		/**
		 * Cooldown for this command (milliseconds)
		 * @prop {Number} cooldown
		 */
		this.cooldown = meta.cooldown||config.defaultCooldown||2000;

		/**
		 * The Command utility
		 * @prop {CommandUtility} cmdUtil
		 */
		this.cmdUtil = CommandUtility;
	}

	/**
	 * Check if user has permissions to use this command.
	 * @param {Number} userPermissions The permissions this user possess
	 * @param {Snowflake} [userID] The user ID, for checking fallback config in case access was denied
	 * @returns {Boolean}
	 */
	hasPermission(userPermissions, userID) {
		//TODO: Pretty sure I had brainlag while writing this. Make it better.

		// If no fallback, or user is not in, rely on normal check
		if (!config.FALLBACK || userID in config.FALLBACK) {
			return !!(this.permission & userPermissions);
		}

		if (!(this.permission & userPermissions)) {
			userPermissions = config.FALLBACK[userID];
			return !!(this.permission & userPermissions);
		}

		// If user has 'blocked' permission, deny access
		if (userPermissions & config.ACCESS.blocked) return false;

		return !!(this.permission & userPermissions);
	}

	/**
	 * Tries to execute the function
	 * @param {Message} msg The message the user sent
	 * @param {Array<String>} args Any arguments the user passed
	 * @returns {Promise}
	 */
	async run(msg, args=[]) {
		if (!msg) throw new Error("Missing message");
		if (msg.constructor.name!=="Message") throw new Error(`Invalid object passed for message. Expected 'Message', got '${msg.constructor.name}'`);

		// Check if currently on cooldown first
		if (msg.client.cooldowns.has(`${msg.author.id}:${this.label}`)) {
			return this.cooldownMessage(msg); 
		}

		let timer;
		try {
			// Add cooldown
			msg.client.cooldowns.set(`${msg.author.id}:${this.label}`, Date.now()+this.cooldown);

			timer = setTimeout(()=>{
				msg.client.cooldowns.delete(`${msg.author.id}:${this.label}`);
			}, this.cooldown);

			// Execute
			await Promise.resolve(this.exec(msg, args));
			return;
		} catch (err) {

			// Clear timeout timer, and remove cooldown right away
			clearTimeout(timer);
			msg.client.cooldowns.delete(`${msg.author.id}:${this.label}`);
			console.error(err);

			// Send error message to user
			let embed = CommandUtility.emb(msg)
				.setTitle(":x: Something went wrong…")
				.setDescription(`Try again later. Notify developers if this problem persists.`)

			return msg.channel.send(embed);
		}
	}

	/**
	 * Sends an auto-self-deleting cooldown message of 'cooldown, wait another X seconds'
	 * @param {Message} msg The users message
	 * @abstract
	 */
	async cooldownMessage(msg) {
		const until = msg.client.cooldowns.get(`${msg.author.id}:${this.label}`);
		if (!until) return;

		let embed = CommandUtility.emb(msg)
			.setTitle(":x: Cooldown")
			.setDescription(`Try again in \`${((until - Date.now())/1000).toFixed(2)}\` seconds.`)

		await msg.channel.send(embed)
			.then(m => {
				return m.delete({
					timeout: 3000,
					reason: "Auto-deleting cooldown message"
				});
			});
	}

	/**
	 * Performs a live hot-reload of the command and all the files it require() that are within the commands folder. Returns 'Error' if an error occurred.
	 * @returns {Boolean|Error}
	 */
	reload(Client) {
		try {
			const path = require("path");

			// Get the files original location
			let filepath = this.filepath;
			filepath = path.normalize(filepath);

			// Delete cache
			this._recursiveDelete(filepath);
			
			// Require the module
			const cmd = require(filepath);

			// Create new command, and load replace self with it
			let newCmd = new Command(filepath, cmd.cmd, cmd, cmd.exec);
			Client.commands[this.label] = newCmd;

			return true;
		} catch (err) {
			console.error(`COMMAND RELOAD ERROR: `, err);
			return err;
		}
	}

	/**
	 * Recursive deletes all children that are within the 'commands' folder
	 * @prop {String} filepath The current file to delete/iterate children over
	 * @private
	 */
	_recursiveDelete(filepath) {
		if (!filepath.split(process.platform === "win32" ? "\\" : "/").includes("commands")) return;

		if (require.cache[filepath].children.length) require.cache[filepath].children.forEach(child => this._recursiveDelete(child.id));

		delete require.cache[filepath];
	}
}