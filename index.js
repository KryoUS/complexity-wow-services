require('dotenv').config();
const ServicesLogging = require('./db/dbLogging');
const getDb = require('./db/db');
const blizzardApi = require('./services/token');
const simulationcraft = require('./services/simulationcraft');
const characters = require('./services/characters');

//Get Massive connection
getDb().then(db => {
    //Log Database Connection
    ServicesLogging(db, 'database', 'Database Connected');

    // don't pass the instance
    return Promise.resolve();
}).then(() => {
    // retrieve the already-connected instance synchronously
    const db = getDb();    

    //Starts Cron (This is necessary and the Cron will not run until the specified time)
    blizzardApi.setBlizzardToken(db);
    characters.get(db);
    characters.cleanup(db);
    simulationcraft.get(db);
    // characterCron.start();
    // characterCleanupCron.start();

}).catch(error => {
    console.log('DB Connection Error: ', error);
});