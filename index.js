require("dotenv").config();
const path = require("path");
global.rootFolder = path.resolve(__dirname);

module.exports = {
	config: require("./config.json"),
	Client: require("./src/bot"),
	handleErr: require("./util/ErrorHandler"),
	// database: require("./util/Database")
};