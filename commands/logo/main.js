const _logo = require("./logo");

module.exports = {
	logo: async function(msg, data, doc, url) {
		return await _logo(msg, data, doc, url);
	}
};