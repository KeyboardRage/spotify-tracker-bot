/**
 * Sets up handlers and whatnot
 */
const { store, cache } = require("../providers/Redis");
const { db, users, guilds, songs } = require("../providers/MongoDB");
const MongoHandler = require("../structures/Mongo");
const RedisHandler = require("../structures/Redis");

const Mongo = new MongoHandler({users, guilds, songs});
const Store = new RedisHandler(store);

module.exports.Mongo = Mongo;
module.exports.Store = Store;