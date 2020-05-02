const config = require("../config.json");
const Redis = require("ioredis");
const redis = new Redis(config.redis.options);

module.exports = redis;