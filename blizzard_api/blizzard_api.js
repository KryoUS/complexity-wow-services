const axios = require('axios');
const { blizzardAPI } = require('../config.json');

let blizzardToken = '';

module.exports = {
    setBlizzardToken: () => {
        axios.post(`https://us.battle.net/oauth/token`, 'grant_type=client_credentials', {
            auth: {
                username: blizzardAPI.clientID,
                password: blizzardAPI.clientSecret
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