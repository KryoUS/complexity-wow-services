const getDb = require('./db');

module.exports = {
    bnetLogging: async (status, statusText, method, baseurl, url, message) => {
        let db = await getDb();

        db.bnetlog.insert({
            status: status,
            statustext: statusText,
            method: method,
            baseurl: baseurl,
            url: url,
            message: message
        }).then(result => {
            //Do nothing with results
        }).catch(error => {
            console.log(`${new Date()} ===Massive.js DB Bnet Log Insert Error===`, error);
        })
    },

    bnetLoggingCleanup: async () => {
        let db = await getDb();

        db.query("DELETE FROM bnetlog WHERE created_at < NOW() - INTERVAL '15 days'").catch(dbError => {
            console.log(`${new Date()} ===Massive.js DB Bnet Log Cleanup Error===`, dbError);
        });
    }
}
