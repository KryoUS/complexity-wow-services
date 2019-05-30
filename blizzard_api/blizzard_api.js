const axios = require('axios');

module.exports = {
    setBlizzardToken: () => {
        axios.post(`https://us.battle.net/oauth/token`, 'grant_type=client_credentials', {
            auth: {
                username: process.env.BLIZZ_API_CLIENT_ID, 
                password: process.env.BLIZZ_API_CLIENT_SECRET
            }
        }).then(response => {
            console.log('Token Acquired');
            blizzardToken = response.data.access_token;
        }).catch(wowTokenFetchError => {
            console.log('WoW API Token Fetch Error: ', wowTokenFetchError);
        });
    },

    getBlizzardToken: () => {
        return blizzardToken;
    }

}