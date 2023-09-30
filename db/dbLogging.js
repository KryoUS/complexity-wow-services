const getDb = require('./db');
const functions = require('../tools/functions');

module.exports = {
    servicesLogging: async (category, message, errorJSON) => {

        let db = await getDb();

        db.serviceslog.insert({
            epoch_datetime: new Date().getTime(),
            category: category,
            message: message,
            info: errorJSON ? JSON.stringify(errorJSON, functions.getCircularReplacer()) : '{}'
        }).then(result => {
            //Do nothing with results
        }).catch(error => {
            console.log(`${new Date()} Massive.js CharacterCronLogging Insert Error = `, error);
        })
    },

    ServicesLoggingCleanup: async () => {
        let db = await getDb();

        db.query("DELETE FROM serviceslog WHERE created_at < NOW() - INTERVAL '15 days'").catch(dbError => {
            console.log(`${new Date()} ===Massive.js DB Bnet Log Cleanup Error===`, dbError);
        });
    }
}
