const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    // At 07 minutes past the hour, collect the "Breaking News" Alert from World of Warcraft.
    get: (db) => new CronJob('00 07 * * * *', () => {
        axios.get('http://launcher.worldofwarcraft.com/alert').then(res => {

            //Create object for DB Insert, removing Blizzard's HTML.
            let obj = {
                epoch_datetime: new Date().getTime(),
                alert: res.data.substring(res.data.indexOf('<p>') + 3, res.data.indexOf('</p>') - 1),
            };
            
            //If this EXACT alert message was already seen, do not insert and log that it was already seen.
            if (!db.breakingnews.findOne({alert: obj.alert})) {
                db.breakingnews.insert(obj).then(response => {
                    ServicesLogging(db, 'breakingNews', `Data inserted.`);
                }).catch(insertError => {
                    //Log to database an error in inserting data.
                    ServicesLogging(db, 'breakingNews', `DB insert error.`, insertError);
                });
            } else {
                //Log a duplicate was found.
                ServicesLogging(db, 'breakingNews', `Alert already captured.`);
            }

        }).catch(alertError => {
            ServicesLogging(db, 'breakingNews', `Alert fetch error.`, alertError);
        });
    }, null, true, 'America/Denver', null, false),
};