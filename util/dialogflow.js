/* eslint-disable no-console */
const dialogflow = require("dialogflow");
// const uuid = require("uuid");

module.exports.dialogflow = dialogflow;

module.exports.ask = ask;
/**
 * Communicate with Dialogflow
 * @param {"msg"} msg The original message object
 * @param {String} message The message the user sent
 */
async function ask(msg, message) {
	return new Promise(async (resolve) => {

		// const session = uuid.v4(); //TODO: Replace with User's UID.
		
		// Create session
		// const sessionClient = new dialogflow.SessionsClient();
		// const sessionPath = sessionClient("grafik-bot-v1", msg.author.id);
		const sessionClient = new dialogflow.SessionsClient();
		const sessionPath = sessionClient.sessionPath("grafik-bot-v1", msg.author.id);
		
		// Query
		const req = {
			session: sessionPath,
			queryInput: {
				text: {
					// The question
					text: message,
					languageCode: "en-US"
				},
			},
		};
		
		// Send and log result
		const responses = await sessionClient.detectIntent(req);
		const result = responses[0].queryResult;
		// console.log(`Query: ${result.queryText}`);
		// console.log(result.fulfillmentMessages[0]);
		// type 1 = raw text, 2 = action
		let value = result.fulfillmentText.length ? result.fulfillmentText : {
			action: result.fulfillmentMessages[0].payload.fields.action.stringValue,
			value: result.fulfillmentMessages[0].payload.fields.value.stringValue
		};
		return resolve({
			value: value,
			type: result.fulfillmentText.length?1:2,
			intent: result.intent ? result.intent.displayName : null
		});
	});
}