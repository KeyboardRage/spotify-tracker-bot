const _logo = require("./logo");
const _meme = require("./meme");
const _userSubmission = require("./userSubmission");

module.exports = {
	logo: async function(msg, data, doc, url) {
		return await _logo(msg, data, doc, url);
	},
	meme: async function(msg, data, doc, args) {
		return await _meme(msg, data, doc, args);
	},
	userSubmission: async function(msg, doc, data) {
		return await _userSubmission(msg, doc, data);
	}
};