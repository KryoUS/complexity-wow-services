const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging').servicesLogging;

module.exports = {

    getScore: (db) => new CronJob('06 */10 * * * *', () => {
                
        axios.get(`https://www.wowprogress.com/guild/us/thunderlord/Complexity/json_rank`).then(res => {
            
            db.wowcache.saveDoc({
                id: 16,
                cacheType: 'guild score',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'wowprogress guild score', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: WoWProgress Guild Score Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'raiderioapi', 'WoWProgress Guild Score API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

};