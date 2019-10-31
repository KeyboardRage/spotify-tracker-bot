//===========================
//	LOAD EXTRA STUFF
//===========================
const config = require("../data/config.json");
const chalk = require("chalk");
const {maindb} = require("./database");
const {RedisDB} = require("./redis");
//==== SENTRY: Error handling/notification system ====
const Sentry = require("@sentry/node");
Sentry.init({dsn:"https://f53bab8e202142dcaed5668003285469@sentry.io/1727006"});
module.exports = true;
//================================
//	PROCESS EVENTS
//================================
process.on("exit", code => {
	if(code===0) {
		console.info(chalk.black.bgRed(" SHUTDOWN ") + chalk.black.bgGreen(` ✓ Status: ${code} `));
	} else {
		console.info(chalk.black.bgRed(" SHUTDOWN ") + chalk.black.bgRed(` × Status: ${code} `));
	}
});
process.on("unhandledRejection", err => {
	if (process.env.DEBUG === "true") console.error(chalk.black.bgRed(" × ")+chalk.red(" ERROR: "), err);
	else Sentry.captureException(err);
	return;
});
process.on("uncaughtException", err => {
	if(process.env.DEBUG==="true") console.error(chalk.black.bgRed(" × ")+chalk.red(" ERROR: "), err);
	else Sentry.captureException(err);
	return;
});

//================================
//	GRACEFUL SHUTDOWN
//================================
config.kill_signatures.forEach(signal => {
	process.on(signal, () => {
		//! Do nest.
		console.info(chalk.yellow("Recieved signal: "+signal));
		RedisDB.flushall(err => {
			if (err) {
				console.info(chalk.black.bgRed("SHUTDOWN UNGRACEFUL → Extras.kill_signals.RedisDB.flushall(): "), err);
				process.exit(1);
			}
			console.info(chalk.black.bgRed(" FLUSHALL ") + chalk.black.bgGreen(" EMPTIED ") + " Redis databases");
			// Close Redis:
			RedisDB.quit(err => {
				if (err) {
					console.info(chalk.black.bgRed("SHUTDOWN UNGRACEFUL → Extras.kill_signals.RedisDB.quit(): "), err);
					process.exit(1);
				}
				RedisDB.removeAllListeners();
				console.info(chalk.black.bgRed(" SHUTDOWN ") + chalk.black.bgGreen(" GRACEFUL ") + " for Redis")
				// Close MongoDB
				maindb.close(err=>{
					if (err) {
						console.info(chalk.black.bgRed("SHUTDOWN UNGRACEFUL → Extras.kill_signals.Mongoose.close(): "), err);
						process.exit(1);
					}
					maindb.removeAllListeners();
					console.info(chalk.black.bgRed(" SHUTDOWN ")+chalk.black.bgGreen(" GRACEFUL ")+" for MongoDB");
					process.exit(0); //*Final.
				});
			});
		});
	});
});