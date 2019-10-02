const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    // Every other hour, at 33 minutes past the hour, collect all Item IDs from the icons table. Grabs all icons that we don't already have from Blizzard.
    getItemIcons: (db) => new CronJob('00 33 */2 * * *', () => {
        db.query('select id from icons').then(response => {
            
            let count = 1;

            for (i = 1; i < 200000; i++) {

                if (response.findIndex(x => x.id === i) === -1) {
            
                    const startItemIconCollection = (count, index) => {
                
                        setTimeout(() => {
                            
                            axios.get(`https://us.api.blizzard.com/data/wow/media/item/${index}?namespace=static-us&locale=en_US&access_token=${process.env.BLIZZ_API_TOKEN}`).then(res => {
                                
                                let obj = {
                                    id: index,
                                    epoch_datetime: new Date().getTime(), 
                                    iconurl: res.data.assets[0].value
                                }

                                req.app.get('db').icons.insert(obj).then(dbRes => {
                                }).catch(dbErr => {
                                    console.log('Database Insert Error -----------------------------------------', dbErr);
                                });

                            }).catch(wowErr => {

                                if (wowErr.response.status === 404) {
                                    let obj = {
                                        id: index,
                                        epoch_datetime: new Date().getTime(), 
                                        iconurl: null
                                    }

                                    req.app.get('db').icons.insert(obj).then(dbRes => {
                                    }).catch(dbErr => {
                                        console.log('Database Insert Error -----------------------------------------', dbErr);
                                    });
                                } else {
                                    console.log('WoW API Error -----------------------------------------', wowErr);
                                }

                            })

                        }, count * 50);
                    }

                    startItemIconCollection(count, index);
                    count++;
                }

            }
        }).catch(error => {
            console.log('getItemIcons Error');
            console.log(error);
            res.status(500).send('getItemIcons Error');
        })
    }, null, true, 'America/Denver', null, false),
};