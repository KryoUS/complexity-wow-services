const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../../db/dbLogging');

module.exports = {
    // At 30 minutes past the hour, collect all logs from WarcraftLogs and all our current logs from DB
    // then strip array duplicate logs. If any still exist, insert them and pull the Fight Detail from WarcraftLogs to be inserted.
    getLogs: (db) => new CronJob('00 30 0-23 * * 0-6', () => {
        axios.get(`https://www.warcraftlogs.com:443/v1/reports/guild/complexity/thunderlord/US?api_key=${process.env.WARCRAFTLOGS_TOKEN}`).then(res => {

            db.query('select id from warcraftlogs').then(logs => {

                if (logs.length > 0) {
                    logs.forEach(currLogs => {
                        res.data = res.data.filter(newLogs => newLogs.id !== currLogs.id);
                    });
                }

                res.data.forEach((newReport, index) => {

                    const closureFunction = (newReportObj, reportIndex, db) => {
            
                        setTimeout(() => {
    
                            axios.get(`https://www.warcraftlogs.com/v1/report/fights/${newReportObj.id}?api_key=${process.env.WARCRAFTLOGS_TOKEN}`).then(res => {

                                db.warcraftlogsdetail.insert({
                                    id : newReportObj.id, 
                                    body : res.data
                                }).then(res => {
                                    ServicesLogging(db, 'warcraftlogs', `New Report Detail added for ${newReportObj.id}.`);
                                }).catch(saveDocErr => {
                                    ServicesLogging(db, 'warcraftlogs', `DB saveDoc error.`, saveDocErr);
                                });
    
                            }).catch(warcraftLogsError => {
                                ServicesLogging(db, 'warcraftlogs', `Warcraft Logs API Error.`, warcraftLogsError);
                            });
    
                        }, 3000 * reportIndex); //This runs every 3 seconds.
                    }
    
                    closureFunction(newReport, index, db);

                });

                if (res.data.length > 0) {
                    db.warcraftlogs.insert(res.data).then(response => {
                        ServicesLogging(db, 'warcraftlogs', `Data inserted.`);
                    }).catch(insertError => {
                        //Log to database an error in inserting data.
                        ServicesLogging(db, 'warcraftlogs', `DB insert error.`, insertError);
                    });
                } else {
                    ServicesLogging(db, 'warcraftlogs', `No new logs found.`);
                }

            }).catch(dbLogFetchError => {
                ServicesLogging(db, 'warcraftlogs', `Log DB fetch error.`, dbLogFetchError);
            });

        }).catch(logFetchError => {
            ServicesLogging(db, 'warcraftlogs', `Log fetch error.`, logFetchError);
        });
    }, null, true, 'America/Denver', null, false),
};