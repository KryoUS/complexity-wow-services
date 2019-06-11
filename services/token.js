const axios = require('axios');
const CronJob = require('cron').CronJob;
const CharacterCronLogging = require('../db/dbLogging');

module.exports = {
    setBlizzardToken: (db) => new CronJob('00 0 */1 * * *', () => {
        axios.post(`https://us.battle.net/oauth/token`, 'grant_type=client_credentials', {
            auth: {
                username: process.env.BLIZZ_API_CLIENT_ID, 
                password: process.env.BLIZZ_API_CLIENT_SECRET
            }
        }).then(response => {
            
            if (process.env.BLIZZ_TOKEN != response.data.access_token) {
                CharacterCronLogging(db, 'blizzardapi', `New Token acquired, expires in ${response.data.expires_in}.`);
            } else {
                CharacterCronLogging(db, 'blizzardapi', `Valid token already present, expires in ${response.data.expires_in}.`);
            }
    
            process.env.BLIZZ_TOKEN = response.data.access_token;
        }).catch(wowTokenFetchError => {
            CharacterCronLogging(db, 'blizzardapi', 'API Error', wowTokenFetchError);
        });
    }, null, true, 'America/Denver', null, true),
};