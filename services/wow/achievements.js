const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {

    getAchievements: (db) => new CronJob('15 10 0-23 * * 0-6', () => {
        
        //Get Achievements Index
        axios.get(`https://us.api.blizzard.com/data/wow/achievement-category/index?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(achieveCatIndex => {
            
            let { categories } = achieveCatIndex.data;
            let lastCatIndex = categories.length - 1;

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
                                ServicesLogging(db, 'achievements', `Category collection complete.`);
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
                                                        ServicesLogging(db, 'database', 'Achievements update error.', {error: JSON.stringify(dbAchievementsError)});
                                                    });

                                                    //Check for last achievement of the category, then log to DB.
                                                    if (achieveIndex === lastAchieveIndex) {
                                                        
                                                        ServicesLogging(db, 'achievements', `Category "${achieveDetail.data.category.name}" Achievements collection complete.`);
                                                        
                                                        //Check for the completion of the last category of the last achievement.
                                                            //TODO: Not very accurate and needs to be improved.
                                                        if (lastCategory) {
                                                            ServicesLogging(db, 'achievements', `Achievements collection completed.`);
                                                        };
                                                    };
                                                }).catch(achieveMediaError => {
                                                    ServicesLogging(db, 'blizzardapi', 'Achievement Detail Media API error.', achieveMediaError.response.data);
                                                });

                                            }).catch(achieveDetailError => {
                                                ServicesLogging(db, 'blizzardapi', 'Achievement Detail API error.', achieveDetailError.response.data);
                                            });
                                        }, 1000 * achieveIndex); //This runs at 1 per second which ends up being 3,600 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)

                                    };

                                    //Run Achievement Closure Function
                                    achieveClosure(db, achieveObj, achieveIndex, lastAchieveIndex, catIndex, lastCategory, lastCatIndex);

                                });

                            }

                        }).catch(achievementCatDetailError => {
                            ServicesLogging(db, 'blizzardapi', 'Achievement Category Detail API error.', achievementCatDetailError.response.data);
                        })

                    }, 1000 * catIndex); //This runs at 1 per second which ends up being 3,600 Blizzard API Calls per hour. (Blizzard cap is 36,000 per hour.)
                }

                //Run Achievement Category Function
                catClosure(db, catObj, catIndex, lastCatIndex);

            });

        }).catch(achievementCatIndexAPIError => {
            ServicesLogging(db, 'blizzardapi', 'Achievement Category Index API error.', achievementCatIndexAPIError.response.data);
        });
    }, null, true, 'America/Denver', null, false),
};