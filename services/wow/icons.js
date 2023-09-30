const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging').servicesLogging;

module.exports = {
    // Every hour, at 33 minutes past the hour, find the highest icon ID we have and start requesting up to 10,000 new ones.
    getItemIcons: (db) => new CronJob('00 33 */1 * * *', () => {
        ServicesLogging(db, 'iconItems', `Item Icon collection started.`);

        db.query('select id from icons order by id desc limit 1').then(response => {

            let maxID = response[0].id;
            let count = 0;
            let maxCount = maxID + 10000;

            for (i = maxID; i < maxCount; i++) {
            
                const startItemIconCollection = (iconID, db, maxCount, count, startingID) => {
            
                    setTimeout(() => {
                        
                        axios.get(`https://us.api.blizzard.com/data/wow/media/item/${iconID}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
                            
                            let obj = {
                                id: iconID,
                                epoch_datetime: new Date().getTime(), 
                                iconurl: res.data.assets[0].value
                            }

                            db.icons.insert(obj).then(dbRes => {

                            }).catch(dbErr => {
                                //Log to database an error in inserting data.
                                ServicesLogging(db, 'iconItems', `DB insert error.`, dbErr);
                            });

                        }).catch(wowErr => {
                            
                            if (wowErr.errno == 'ETIMEDOUT') {
                                //Log to database an error in collecting data.
                                ServicesLogging(db, 'iconSpells', `WoW API Timeout.`, wowErr);
                            }
                            
                            if (wowErr.response && wowErr.response.status !== 404) {
                                //Log to database an error in collecting data.
                                ServicesLogging(db, 'iconItems', `WoW API Error.`, wowErr.response);
                            }

                        });

                        if (iconID === maxCount) {
                            ServicesLogging(db, 'iconItems', `Item Icon collection finished. (${startingID} to ${maxCount})`);
                        }

                    }, 250 * count); //This runs at 4 per second which ends up being 14,400 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                }

                startItemIconCollection(i, db, maxCount, count, maxID);
                count++;

            }
        }).catch(error => {
            ServicesLogging(db, 'iconItems', `DB fetch error.`, error);
        })
    }, null, true, 'America/Denver', null, false),


    // Every hour, at 35 minutes past the hour, find the highest spell icon ID we have and start requesting up to 10,000 new ones.
    getSpellIcons: (db) => new CronJob('00 35 */1 * * *', () => {
        
        ServicesLogging(db, 'iconSpells', `Spell Icon collection started.`);

        db.query('select id from spellicons order by id desc limit 1').then(response => {

            let maxID = response[0].id;
            let count = 0;
            let maxCount = maxID + 10000;

            for (let i = maxID; i < maxCount; i++) {
            
                const startItemIconCollection = (spelliconID, db, maxCount, count, startingID) => {
            
                    setTimeout(() => {

                        //NOTE: This is the old Blizzard API since they do not have a Media endpoint for Spell Icons yet. 2019-10-26
                        axios.get(`https://us.api.blizzard.com/wow/spell/${spelliconID}?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {

                            res.data.iconurl = `https://render-us.worldofwarcraft.com/icons/56/${res.data.icon}.jpg`;
                            res.data.unix_datetime = new Date().getTime();
                            res.data.casttime = res.data.castTime;

                            db.spellicons.insert(res.data).then(dbRes => {
                                
                            }).catch(dbErr => {
                                //Log to database an error in inserting data.
                                ServicesLogging(db, 'iconSpells', `DB insert error.`, dbErr);
                            });

                        }).catch(wowErr => {

                            if (wowErr.errno == 'ETIMEDOUT') {
                                //Log to database an error in collecting data.
                                ServicesLogging(db, 'iconSpells', `WoW API Timeout.`, wowErr);
                            }

                            if (wowErr.response && wowErr.response.status !== 404) {
                                //Log to database an error in collecting data.
                                ServicesLogging(db, 'iconSpells', `WoW API Error.`, wowErr.response);
                            }
                        });

                        if (spelliconID === maxCount) {
                            ServicesLogging(db, 'iconSpells', `Spell Icon collection finished. (${startingID} to ${maxCount})`);
                        }

                    }, 250 * count); //This runs at 4 per second which ends up being 14,400 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                }

                startItemIconCollection(i, db, maxCount, count, maxID);
                count++;
            }
        }).catch(error => {
            ServicesLogging(db, 'iconSpells', `DB fetch error.`, error);
        })

    }, null, true, 'America/Denver', null, false),
};