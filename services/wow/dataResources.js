const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    getBattlegroups: (db) => new CronJob('00 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/battlegroups/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 1,
                cacheType: 'battlegroups',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'battlegroups', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Battlegroups Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Battlegroups API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getCharacterClasses: (db) => new CronJob('01 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/character/classes/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 2,
                cacheType: 'character classes',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'character classes', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Character Classes Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Character Classes API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),
};