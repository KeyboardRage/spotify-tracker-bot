module.exports = async err => {
	const moment = require("moment");

	class ErrorHandler extends Error {
		/**
		 * Creates a generic error handler
		 * @param {Error} err The error thrown
		 * @param {Any} [meta] Additional data
		 */
		constructor(err, args) {
			super(err);
	
			/**
			 * The intial creator of the error
			 * @param {String} name
			 */
			this.name = err.constructor.name;

			/**
			 * Any other arguments passed in to the error
			 * @property {Array<Any>} args
			 */
			this.args = args;
	
			/**
			 * When the error occurred
			 * @param {Date} timestamp
			 */
			this.timestamp = new Date();

			/**
			 * The time format used for displaying error timestamp. {@link https://momentjs.com/docs/#/displaying/format/}
			 * @property {String} dateFormat
			 */
			this.dateFormat = "D/MMM/YYYY @ HH:mm:ss";
		}

		/**
		 * Return a easily readable timestamp format
		 * @returns {String}
		 */
		get date() {
			return new moment(this.timestamp).format(this.dateFormat);
		}

	}

	// How you want to handle errors. E.g. right now it just logs it.
	const error = new ErrorHandler(err, [...arguments].slice(1));
	console.error(`[${error.date}] Error: ${error.name} → `, error);
};