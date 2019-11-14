const _info = require("./info.js");
const _new = require("./new.js");
const minor = require("./minors");

module.exports = {
	info: _info,
	// job: _job,
	new: _new,
	accept: minor.accept,
	decline: minor.decline,
	abort: minor.abort
	// other: _other
};
/*
TODO:
1. Make the 24 hour expiration thing.
2. Make the help commands.
3. Implement limitations, for example amount of requests.
4. Add "you may not use this cmd again while not having finished last one".
5. Additional cooldown on certain sub-commands.

*/