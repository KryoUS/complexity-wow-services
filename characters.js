const massive = require('massive');
const axios = require('axios');
const { apikey, postgresql } = require('./config.json');

const wowApi = `https://us.api.battle.net/wow/guild/Thunderlord/Complexity?fields=members%2Cnews&locale=en_US&apikey=${apikey}`;
let charCount = 0;

console.log('Cron Running');

massive({
    host: postgresql.host,
    port: postgresql.port,
    database: postgresql.database,
    user: postgresql.user,
    password: postgresql.password,
    ssl: true
}).then(db => {
    console.log('PostgreSQL Connection Established');

    db.characters.destroy().then(desErr => {
        console.log('Characters Table Removed');
    });

    axios.get(wowApi).then(response => {
        console.log('Api Responded');
        response.data.members.forEach((obj, i) => {
            
            if (obj.character.spec) {
                charCount++;
                const { name, realm, race, level, achievementPoints } = obj.character;
                const clas = obj.character.class;
                const { role, backgroundImage, icon, description } = obj.character.spec;
                const specName = obj.character.spec.name;
                const rank = obj.rank;
                const avatar = obj.character.thumbnail;
                const avatarSmall = `http://render-us.worldofwarcraft.com/character/${avatar}`;
                const avatarMed = `http://render-us.worldofwarcraft.com/character/${avatar.replace('avatar', 'inset')}`;
                const avatarLarge = `http://render-us.worldofwarcraft.com/character/${avatar.replace('avatar', 'main')}`;
    
                db.characters.insert(
                    {character_name: name,
                    realm: realm,
                    class: clas,
                    race: race,
                    level: level,
                    achievements_pts: achievementPoints,
                    avatar_small: avatarSmall,
                    avatar_med: avatarMed,
                    avatar_large: avatarLarge,
                    spec_name: specName,
                    spec_role: role,
                    spec_background_img: backgroundImage,
                    spec_icon: icon,
                    spec_desc: description,
                    rank: rank}
                , (pgError, res) => {
                    console.log(res)
                    if (pgError) {
                        console.log(pgError);
                    }
                }).catch(error => {
                    console.log('PostgreSQL Insert Failed!', error);
                })
            }
        })
        console.log(`(${charCount}) Characters Inserted`);
    }).catch(err => {
        console.log('WoW Api Failed! ', err);
    });
});

setTimeout(function(){
    console.log('Restarting App...');
    process.exit(0);
}, 86400000);