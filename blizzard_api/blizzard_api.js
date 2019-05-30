const axios = require('axios');
const CharacterCronLogging = require('../db/dbLogging');

module.exports = {
    setBlizzardToken: () => {
        axios.post(`https://us.battle.net/oauth/token`, 'grant_type=client_credentials', {
            auth: {
                username: process.env.BLIZZ_API_CLIENT_ID, 
                password: process.env.BLIZZ_API_CLIENT_SECRET
            }
        }).then(response => {
            
            if (process.env.BLIZZ_TOKEN != response.data.access_token) {
                CharacterCronLogging(db, 'blizzardapi', `New Token acquired, expires in ${Math.floor((response.data.expires_in / (1000 * 60)) % 60)} minutes.`);
            } else {
                CharacterCronLogging(db, 'blizzardapi', `Valid token already present, expires in ${Math.floor((response.data.expires_in / (1000 * 60)) % 60)} minutes.`);
            }

            process.env.BLIZZ_TOKEN = response.data.access_token;
        }).catch(wowTokenFetchError => {
            CharacterCronLogging(db, 'blizzardapi', 'API Error', wowTokenFetchError);
        });
    },

}