const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');
const forumCategory = require('./wow_forum_cat.json');

module.exports = {

    getPatchNotes: (db) => new CronJob('00 */10 * * * *', () => {
                
        axios.get(`https://blizztrack.com/feeds/notes/world_of_warcraft/json`).then(res => {
            
            res.data.items.forEach((obj, index) => {
                obj.content_html = obj.content_html.replace(new RegExp('<strong>Death Knight</strong>', 'g'), '<strong id="deathKnight">Death Knight</strong>')
                .replace(new RegExp('<strong>Demon Hunter</strong>', 'g'), '<strong id="demonHunter">Demon Hunter</strong>')
                .replace(new RegExp('<strong>Druid</strong>', 'g'), '<strong id="druid">Druid</strong>')
                .replace(new RegExp('<strong>Hunter</strong>', 'g'), '<strong id="hunter">Hunter</strong>')
                .replace(new RegExp('<strong>Mage</strong>', 'g'), '<strong id="mage">Mage</strong>')
                .replace(new RegExp('<strong>Monk</strong>', 'g'), '<strong id="monk">Monk</strong>')
                .replace(new RegExp('<strong>Paladin</strong>', 'g'), '<strong id="paladin">Paladin</strong>')
                .replace(new RegExp('<strong>Priest</strong>', 'g'), '<strong id="priest">Priest</strong>')
                .replace(new RegExp('<strong>Rogue</strong>', 'g'), '<strong id="rogue">Rogue</strong>')
                .replace(new RegExp('<strong>Shaman</strong>', 'g'), '<strong id="shaman">Shaman</strong>')
                .replace(new RegExp('<strong>Warlock</strong>', 'g'), '<strong id="warlock">Warlock</strong>')
                .replace(new RegExp('<strong>Warrior</strong>', 'g'), '<strong id="warrior">Warrior</strong>');

                if (res.data.items.length - 1 === index) {
                    db.wowcache.saveDoc({
                        id: 10,
                        cacheType: 'patchnotes',
                        data: res.data,
                    }).then(response => {
                        ServicesLogging(db, 'blizztrack wow patch notes', `Data inserted.`);
                    }).catch(dbError => {
                        console.log(`Database Insertion Error: Blizztrack WoW Patch Notes Insert Failed.`, dbError);
                    });
                }
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizztrackapi', 'Blizztrack WoW Patch Notes API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getVersion: (db) => new CronJob('01 */10 * * * *', () => {
                
        axios.get(`https://blizztrack.com/api/world_of_warcraft/info/json?mode=vers`).then(res => {
            
            db.wowcache.saveDoc({
                id: 11,
                cacheType: 'version',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'blizztrack wow version', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Blizztrack WoW Version Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizztrackapi', 'Blizztrack WoW Version API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getBluePosts: (db) => new CronJob('03 */10 * * * *', () => {
                
        axios.get(`https://blizztrack.com/api/forums/world_of_warcraft/latest_post/blue`).then(res => {
            
            res.data.forEach((obj, index) => {
                obj.category = forumCategory[`${obj.category_id}`];

                if (index === res.data.length - 1) {
                    db.wowcache.saveDoc({
                        id: 13,
                        cacheType: 'blue posts',
                        data: res.data,
                    }).then(response => {
                        ServicesLogging(db, 'blizztrack wow blue posts', `Data inserted.`);
                    }).catch(dbError => {
                        console.log(`Database Insertion Error: Blizztrack WoW Blue Posts Insert Failed.`, dbError);
                    });
                }
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizztrackapi', 'Blizztrack WoW Blue Posts API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

};