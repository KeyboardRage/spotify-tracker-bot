/* eslint-disable no-console */
const _register = require("./register");
const _profile = require("./profile");
const _edit = require("./edit");
const _info = require("./info");

module.exports = {
	/**
	 * Initiate register account sequence.
	 * @param {"msg"} msg The original message object
	 * @param {Object} doc The guild document
	 * @param {Array} args The command arguments
	 */
	register: _register,
	/**
	 * Everything "profile" command
	 * @param {"msg"} msg The original message object
	 * @param {Object} doc The guild document
	 * @param {Array} args The command arguments
	 */
	profile: _profile,
	/**
	 * Everything edit profile command
	 * @param {"msg"} msg The original message object
	 * @param {Object} doc The guild document
	 * @param {Array} args The command arguments
	 */
	edit: _edit,
	/**
	 * Everything 'information' in general
	 * @param {"msg"} msg The original message object
	 * @param {Object} doc The guild document
	 */
	info: _info
};

