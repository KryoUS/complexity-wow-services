const bnet = require('../tools/axios/bnet');
const charAuth = require('./character_controller/auth');

module.exports = (db) => bnet.get('/data/wow/guild/thunderlord/complexity/roster?namespace=profile-us&locale=en_US').then(res => {

    const characters = res.data.members;

    characters.map(obj => {
        if (obj.character.level === 70) {
            charAuth(db, encodeURI(obj.character.name.toLowerCase()), encodeURI(obj.character.realm.slug));
        }
    });

}).catch(error => {
    console.log(`${new Date()} Massive.js CharacterCronLogging Insert Error = `, error);
});