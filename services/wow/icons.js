const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    // Every 6 hours, at 33 minutes past the hour, collect all Item IDs from the icons table. Then grabs all icons that we don't already have from Blizzard.
    getItemIcons: (db) => new CronJob('00 33 */6 * * *', () => {
        ServicesLogging(db, 'iconItems', `Item Icon collection started.`);

        db.query('select id from icons').then(response => {
            let count = 1;

            for (i = 1; i < 200000; i++) {

                if (response.findIndex(x => x.id === i) === -1) {
            
                    const startItemIconCollection = (count, index, db) => {
                
                        setTimeout(() => {
                            
                            axios.get(`https://us.api.blizzard.com/data/wow/media/item/${index}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
                                
                                let obj = {
                                    id: index,
                                    epoch_datetime: new Date().getTime(), 
                                    iconurl: res.data.assets[0].value
                                }

                                db.icons.insert(obj).then(dbRes => {
                                }).catch(dbErr => {
                                    //Log to database an error in inserting data.
                                    ServicesLogging(db, 'iconItems', `DB insert error.`, dbErr);
                                });

                            }).catch(wowErr => {
                                if (wowErr.response.status !== 404) {
                                    //Log to database an error in collecting data.
                                    ServicesLogging(db, 'iconItems', `WoW API Error.`, wowErr.response);
                                }

                            })

                        }, count * 250); //This runs at 4 per second which ends up being 14,400 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                    }

                    startItemIconCollection(count, i, db);
                    count++;
                }

            }
        }).catch(error => {
            ServicesLogging(db, 'iconItems', `DB fetch error.`, error);
        })
    }, null, true, 'America/Denver', null, false),


    // Every 6 hours, at 10 minutes past the hour, collect all Spell IDs from the icons table. Then grabs all icons that we don't already have from Blizzard.
    getSpellIcons: (db) => new CronJob('00 10 */6 * * *', () => {
        
        ServicesLogging(db, 'iconSpells', `Spell Icon collection started.`);

        db.query('select id from spellicons').then(response => {
            let count = 1;

            for (i = 1; i < 400000; i++) {

                if (response.findIndex(x => x.id === i) === -1) {
            
                    const startItemIconCollection = (count, index, db) => {
                
                        setTimeout(() => {
                            
                            axios.get(`https://us.api.blizzard.com/wow/spell/280195?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
                                
                                res.data.iconurl = `https://render-us.worldofwarcraft.com/icons/56/${res.data.icon}.jpg`;
                                res.data.unix_datetime = new Date().getTime();
                                res.data.casttime = res.data.castTime;

                                db.spellicons.insert(res.data).then(dbRes => {
                                }).catch(dbErr => {
                                    //Log to database an error in inserting data.
                                    ServicesLogging(db, 'iconSpells', `DB insert error.`, dbErr);
                                });

                            }).catch(wowErr => {
                                if (wowErr.response.status !== 'nok') {
                                    //Log to database an error in collecting data.
                                    ServicesLogging(db, 'iconSpells', `WoW API Error.`, wowErr.response);
                                }
                            })

                        }, count * 250); //This runs at 4 per second which ends up being 14,400 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                    }

                    startItemIconCollection(count, i, db);
                    count++;
                }

            }
        }).catch(error => {
            ServicesLogging(db, 'iconSpells', `DB fetch error.`, error);
        })

    }, null, true, 'America/Denver', null, false),
};