"use strict";

// module.exports = redisHandler;
const ioredis = require("ioredis");
const store = new ioredis({
    port: 6379,
    host: this.address,
    family: 4, // IPv4
    // password: "auth",
    db: 1
});
const cache = new ioredis({
    port: 6379,
    host: this.address,
    family: 4, // IPv4
    // password: "auth",
    db: 2
});

store.on("ready", () => {
	console.log(` ✓ Redis: store connected`);
});

module.exports.store = store;
module.exports.cache = cache;