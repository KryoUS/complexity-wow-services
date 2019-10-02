require('dotenv').config();
const ServicesLogging = require('./db/dbLogging');
const getDb = require('./db/db');
const blizzardApi = require('./services/token');
const simulationcraft = require('./services/simulationcraft');
const wowGuildCharacters = require('./services/characters');
const wow = require('./services/wow/dataResources');
const blizztrack = require('./services/wow/blizztrack');
const raiderIO = require('./services/wow/raiderio');
const wowProgress = require('./services/wow/wowProgress');
const breakingNews = require('./services/wow/breakingNews');
const tsm = require('./services/wow/tradeskillmaster');

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
    wowGuildCharacters.get(db);
    wowGuildCharacters.cleanup(db);
    simulationcraft.get(db);
    wow.getAchievements(db);
    wow.getBattlegroups(db);
    wow.getBosses(db);
    wow.getClasses(db);
    wow.getMounts(db);
    wow.getPetTypes(db);
    wow.getPets(db);
    wow.getRaces(db);
    blizztrack.getBluePosts(db);
    blizztrack.getPatchNotes(db);
    blizztrack.getVersion(db);
    raiderIO.getGuildRaidRanking(db);
    raiderIO.getMythicAffixes(db);
    wowProgress.getScore(db);
    breakingNews.get(db);
    tsm.get(db);
    
    

}).catch(error => {
    console.log('DB Connection Error: ', error);
});