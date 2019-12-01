const fs = require("fs");
const path = require("path");

let structure = {
	cmd: String,
	alias: Array,
	cooldown: Number,
	perms: Number,
	dm: Boolean,
	desc: String,

	longdesc: String,
	examples: Array,
	flags: Array,
	group: Number,
	meta: Array,
	syntax: String
};

let groups = {
	"1":"generic",
	"2":"bot",
	"3":"settings"
};