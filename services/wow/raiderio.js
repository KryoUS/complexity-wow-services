const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging').servicesLogging;

module.exports = {

    getGuildRaidRanking: (db) => new CronJob('04 */10 * * * *', () => {
                
        axios.get(`https://raider.io/api/v1/guilds/profile?region=us&realm=Thunderlord&name=complexity&fields=raid_progression%2Craid_rankings`).then(res => {
            
            db.wowcache.saveDoc({
                id: 14,
                cacheType: 'guild rank',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'raiderio guild rank', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: RaiderIO Guild Rank Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'raiderioapi', 'RaiderIO Guild Rank API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getMythicAffixes: (db) => new CronJob('05 */10 * * * *', () => {
                
        axios.get(`https://raider.io/api/v1/mythic-plus/affixes?region=us&locale=en`).then(res => {
            
            db.wowcache.saveDoc({
                id: 15,
                cacheType: 'mythic affixes',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'raiderio mythic affixes', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: RaiderIO Mythic Affixes Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'raiderioapi', 'RaiderIO Mythic Affixes API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

};