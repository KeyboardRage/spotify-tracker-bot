const config = require("../../config");
const mongoose = require("mongoose");
const Int32 = require("mongoose-int32");

const db = mongoose.createConnection(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
 }, err => {
    if (err) {
        console.log(`[${new Date().toLocaleString()}] Error connecting to MongoDB.`);
        throw err;
    }

    console.log(` ✓ MongoDB: Connected`);
});
module.exports.db = db;
/**
 * Remove listeners when connection is closed
 */
db.on("close", () => {
	db.removeAllListeners();
});


const userSchema = new mongoose.Schema({
    _id: String,
    t: {
        type: String,
		alias: "tag",
        required: true
    },
    f: {
        type: Int32,
		alias: "flags",
        required: true,
		default: config.Users.flags.DEFAULT_NEW_USER
	},
	p: {
		type: Int32,
		alias: "permission",
		required: true,
		default: config.ACCESS.user
	},
    c: {
        type: Number,
		alias: "count",
        required: true,
        default: 0
	},
	g: [{
		type: String,
		alias: "guilds",
		required: true,
		ref: "guilds"
	}]
}, {collection:"users"});
const users = db.model("users", userSchema);
module.exports.users = users;

const guildSchema = new mongoose.Schema({
    _id: String,
    p: [{
		// These are permission overrides per guild
        u: {
            type: String,
            name: "permission.user",
            ref: "users"
		},
		d: {
			type: String,
			name: "permission.desc"	
		},
        l: {
            type: Int32,
            name: "permission.level",
            default: config.Users.flags.DEFAULT_NEW_USER
        }
	}],
	n: {
		type: String,
		required: true,
		alias: "name"
	},
	f: {
		type: Int32,
		require: true,
		alias: "flags",
		default: config.Guilds.flags.DEFAULT_NEW_GUILD
	},
    pr: {
        type: String,
        required: true,
        default: config.prefix,
        alias: "prefix"
	},
	l: {
		type: Date,
		required: false,
		alias: "left"
	},
	w: {
		type: String,
		required: false,
		aslias: "webhook.url"
	}
}, {collection: "guilds"});
const guilds = db.model("guilds", guildSchema);
module.exports.guilds = guilds;

const songSchmea = new mongoose.Schema({
    t: {
        type: String,
        required: true,
        alias: "title"
    },
    a: {
        type: Array,
        required: true,
        alias: "artists"
	},
    u: {
        type: String,
        required: true,
        alias: "user",
        ref: "users"
	},
	i: {
		type: String,
		required: false,
		alias: "icon"
	},
    s: {
        type: Date,
        required: true,
        default: new Date(),
        alias: "start"
    },
    e: {
        type: Date,
        required: false,
        alias: "end"
    },
    pt: {
        type: Number,
        required: true,
		alias: "playtime",
		default: 0
	},
	l: {
		type: String,
		required: true,
		alias: "listen"
	}
}, {collection: "songs", autoIndex:true})
const songs = db.model("songs", songSchmea);
module.exports.songs = songs;