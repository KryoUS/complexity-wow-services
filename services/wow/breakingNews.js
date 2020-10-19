const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    // At 48 minutes past the hour, collect the "Breaking News" Alert from World of Warcraft.
    get: (db) => new CronJob('00 48 0-23 * * 0-6', () => {
        axios.get('http://launcher.worldofwarcraft.com/alert').then(res => {

            console.log(res.data);
            
            //Create object for DB Insert, removing Blizzard's HTML.
            let obj = {
                epoch_datetime: new Date().getTime(),
                alert: res.data.substring(res.data.indexOf('<p>') + 3, res.data.indexOf('</p>') - 1),
            };

            if (res.data.length !== 0) {
                db.breakingnews.findOne({alert: obj.alert}).then(findRes => {
                    if (findRes === null) {
                        db.breakingnews.insert(obj).then(response => {
                            ServicesLogging(db, 'breakingNews', `Data inserted.`);
                        }).catch(insertError => {
                            //Log to database an error in inserting data.
                            ServicesLogging(db, 'breakingNews', `DB insert error.`, insertError);
                        });
                    } else {
                        ServicesLogging(db, 'breakingNews', `Alert already exists.`);
                    }
                }).catch(findOneError => {
                    //Log to database an error in searching for a duplicate alert.
                    console.log('Searching for an alert and it derped.', findOneError);
                    ServicesLogging(db, 'breakingNews', `DB FindOne error.`, findOneError);
                });
            } else {
                ServicesLogging(db, 'breakingNews', `No alert present.`);
            }

        }).catch(alertError => {
            ServicesLogging(db, 'breakingNews', `Alert fetch error.`, alertError);
        });
    }, null, true, 'America/Denver', null, false),
};