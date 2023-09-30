const axios = require('axios');
const CronJob = require('cron').CronJob;
const getDb = require('../../db/db');
const ServicesLogging = require('../../db/dbLogging').servicesLogging;

let wowAPIVersion = '';

module.exports = {

    getAchievements: () => new CronJob('1 */15 * * * *', async () => {

        ServicesLogging('achievements', `Achievements collection started.`);
        //Get Achievements Index
        axios.get(`https://us.api.blizzard.com/data/wow/achievement-category/index?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(achieveCatIndex => {
            ServicesLogging('achievements', `Achievements Index API responded.`);

            if (wowAPIVersion !== achieveCatIndex.headers['battlenet-namespace']) {
            
                ServicesLogging('achievements', `Header does not match known version! Setting version and collecting achievements.`, {current: wowAPIVersion, new: achieveCatIndex.headers['battlenet-namespace']});
            
                wowAPIVersion = achieveCatIndex.headers['battlenet-namespace'];

                let { categories } = achieveCatIndex.data;
                let lastCatIndex = categories.length - 1;
                const db = getDb();

                db.wowcache.saveDoc({
                    id: 1,
                    cacheType: 'achievements',
                    data: achieveCatIndex.data,
                }).then(achieveIndexDBRes => {
                    ServicesLogging('achievements', `Achievements Index Inserted.`);
                }).catch(achieveIndexDBError => {
                    console.log(`Database Insertion Error: Achievements Index Insert Failed.`, {error: JSON.stringify(achieveIndexDBError)});
                });

                //Map over all Categories to collect all Achievements
                categories.map((catObj, catIndex) => {
                    
                    //Begin closure function for Achievement Categories
                    const catClosure = (db, catObj, catIndex, lastCatIndex) => {
                
                        setTimeout(() => {

                            //Get Achievement Category Info 
                                //This includes all Achievements that belong to this category.
                                //This also includes all Sub Categories.
                            axios.get(`https://us.api.blizzard.com/data/wow/achievement-category/${catObj.id}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(achieveCatDetail => {

                                let lastCategory = false;

                                //Check for last category for db logging
                                    //TODO: This isn't very accurate and needs to be improved upon.
                                if (catIndex === lastCatIndex) {
                                    lastCategory = true;
                                    ServicesLogging('achievements', `Category collection complete.`);
                                };

                                //Check for achievements under the category
                                if (achieveCatDetail.data.achievements) {

                                    let lastAchieveIndex = achieveCatDetail.data.achievements.length - 1;

                                    //Map over Achievements array
                                    achieveCatDetail.data.achievements.map((achieveObj, achieveIndex) => {

                                        //Begin closure function for achievement collecton
                                        const achieveClosure = (db, achieveObj, achieveIndex, lastAchieveIndex, catIndex, lastCategory, lastCatIndex) => {

                                            setTimeout(() => {
                                                //Get Achievement Info
                                                axios.get(`https://us.api.blizzard.com/data/wow/achievement/${achieveObj.id}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(achieveDetail => {
                                                    //Get Achievement Media
                                                    axios.get(`https://us.api.blizzard.com/data/wow/media/achievement/${achieveObj.id}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(achieveMedia => {
                                                        
                                                        achieveDetail.data.media.assets = achieveMedia.data.assets;
                                                    
                                                        //Save to DB as JSONB
                                                        db.saveDoc('achievements', achieveDetail.data).then(response => {

                                                        }).catch(dbAchievementsError => {
                                                            ServicesLogging('database', 'Achievements update error.', {error: JSON.stringify(dbAchievementsError)});
                                                        });

                                                        //Check for last achievement of the category, then log to DB.
                                                        if (achieveIndex === lastAchieveIndex) {
                                                            
                                                            ServicesLogging('achievements', `Category "${achieveDetail.data.category.name}" Achievements collection complete.`);
                                                            
                                                            //Check for the completion of the last category of the last achievement.
                                                                //TODO: Not very accurate and needs to be improved.
                                                            if (lastCategory) {
                                                                ServicesLogging('achievements', `Achievements collection completed.`);
                                                            };
                                                        };
                                                    }).catch(achieveMediaError => {
                                                        ServicesLogging('blizzardapi', 'Achievement Detail Media API error.', achieveMediaError.response);
                                                    });

                                                }).catch(achieveDetailError => {
                                                    ServicesLogging('blizzardapi', 'Achievement Detail API error.', achieveDetailError.response);
                                                });
                                            }, 1000 * achieveIndex); //This runs at 1 per second which ends up being 3,600 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)

                                        };

                                        //Run Achievement Closure Function
                                        achieveClosure(db, achieveObj, achieveIndex, lastAchieveIndex, catIndex, lastCategory, lastCatIndex);

                                    });

                                }

                            }).catch(achievementCatDetailError => {
                                ServicesLogging('blizzardapi', 'Achievement Category Detail API error.', achievementCatDetailError.response);
                            })

                        }, 1000 * catIndex); //This runs at 1 per second which ends up being 3,600 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                    }

                    //Run Achievement Category Function
                    catClosure(db, catObj, catIndex, lastCatIndex);

                });

            } else {
                ServicesLogging('achievements', `Header matches known version. Skipping achievement collection.`);
            };

        }).catch(achievementCatIndexAPIError => {
            ServicesLogging('blizzardapi', 'Achievement Category Index API error.', achievementCatIndexAPIError.response);
        });
    }, null, true, 'America/Denver', null, false),
};