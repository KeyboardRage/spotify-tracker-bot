module.exports = _main;

const _get = require("./get");

async function _main(msg, args, doc, r) {
	if(r.value.action==="get") return _get(msg, args, doc, r);
	else {
		console.log("Unknown method.");
		msg.channel.send("Sorry, I don't have an answer to that.");
	}
}