const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging').servicesLogging;
const achievements = require('../wow/achievements');

module.exports = {

    achievements: achievements,

    getBattlegroups: (db) => new CronJob('02 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/battlegroups/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 2,
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

    getBosses: (db) => new CronJob('03 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/boss/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 3,
                cacheType: 'bosses',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'bosses', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Bosses Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Bosses API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getClasses: (db) => new CronJob('04 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/character/classes?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 4,
                cacheType: 'classes',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'classes', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Classes Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Classes API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getMounts: (db) => new CronJob('05 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/mount/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 5,
                cacheType: 'mounts',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'mounts', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Mounts Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Mounts API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getPets: (db) => new CronJob('06 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/pet/?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 6,
                cacheType: 'pets',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'pets', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Pets Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Pets API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getPetTypes: (db) => new CronJob('07 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/pet/types?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 7,
                cacheType: 'pet types',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'pet types', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Pet Types Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Pet Types API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

    getRaces: (db) => new CronJob('08 25 0-23 * * 0-6', () => {
                
        axios.get(`https://us.api.blizzard.com/wow/data/character/races?locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(res => {
            
            db.wowcache.saveDoc({
                id: 8,
                cacheType: 'races',
                data: res.data,
            }).then(response => {
                ServicesLogging(db, 'races', `Data inserted.`);
            }).catch(dbError => {
                console.log(`Database Insertion Error: Races Insert Failed.`, dbError);
            });

        }).catch(apiError => {
            ServicesLogging(db, 'blizzardapi', 'Races API error.', apiError);
        });
    }, null, true, 'America/Denver', null, false),

};