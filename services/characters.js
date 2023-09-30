//NO LONGER USED  \o/

const axios = require('axios');
const axiosRetry = require('axios-retry');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../db/dbLogging').servicesLogging;

axiosRetry(axios, { retries: 3 });

let updatedMembers = [];
let insertedMembers = [];
let skippedMembers = [];

module.exports = {
    get: (db) => new CronJob('00 13 0-23 * * 0-6', () => {

        if (process.env.BLIZZ_TOKEN === '') {
            ServicesLogging(db, 'system', 'Blizzard API Token not present, character cron skipped.');
            return
        }

        //WoW Characters API fail counter
        let statAPIFail = 0; 

        //Begin WoW Guild API call
        axios.get(`https://us.api.blizzard.com/data/wow/guild/thunderlord/complexity/roster?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(guildRes => {

            ServicesLogging(db, 'blizzardapi', 'Complexity Guild Members acquired.');

            let memberCount = guildRes.data.members.length;
            updatedMembers = [];
            insertedMembers = [];
            skippedMembers = [];

            //Loop over guild members array
            guildRes.data.members.forEach((obj, i) => {

                //Begin Closure Function to ensure the 100 calls a second quota is not reached for the WoW API
                const upsert = (upsertObj, index, rank) => {

                    setTimeout(() => {

                        const getCharData = async (guildCharObj, charStatus) => {

                            let charData = {
                                id: charStatus.id,
                                charname: guildCharObj.character.name,
                                charrealm: guildCharObj.character.realm.slug
                            };
                            
                            //Achievements
                            let achievements = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/achievements?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.achievements = await achievements.data;
                            //Achievement Statistics
                            let achievementStats = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/achievements/statistics?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.achievementStats = await achievementStats.data;
                            //Appearance
                            let appearance = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/appearance?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.appearance = await appearance.data;
                            //Collections Mounts
                            let mounts = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/collections/mounts?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.mounts = await mounts.data;
                            //Collections Pets
                            let pets = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/collections/pets?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.pets = await pets.data;
                            //Encounters Dungeons
                            let dungeons = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/encounters/dungeons?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.dungeons = await dungeons.data;
                            //Encounters Raids
                            let raids = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/encounters/raids?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.raids = await raids.data;
                            //Equipment
                            let equipment = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/equipment?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.equipment = await equipment.data;
                            //Hunter Pets (404 if not hunter)
                            if (guildCharObj.character.playable_class.id === 3) {
                                let hunterPets = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/hunter-pets?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                                charData.hunterPets = await hunterPets.data;
                            } else {
                                charData.hunterPets = {};
                            }
                            //Media
                            let media = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/character-media?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.media = await media.data;
                            //Mythic Keystone Profile
                            let mythicKeystone = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/mythic-keystone-profile?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.mythicKeystone = await mythicKeystone.data;
                            //Mythic Keystone Profile by Season (Needs Mythic Dungeon SeasonID Index?)
                            //Professions
                            let professions = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/professions?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.professions = await professions.data;
                            //Profile Summary
                            let profile = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.profile = await profile.data;
                            //PVP Bracket 2v2
                            let pvp_2v2 = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/pvp-bracket/2v2?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.pvp_2v2 = await pvp_2v2.data;
                            //PVP Bracket 3v3
                            let pvp_3v3 = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/pvp-bracket/3v3?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.pvp_3v3 = await pvp_3v3.data;
                            //PVP Summary (BGs)
                            let pvp_summary = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/pvp-summary?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.pvp_summary = await pvp_summary.data;
                            //Quests (Current Quest Log Quests)
                            let quests = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/quests?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.quests = await quests.data;
                            //Quests Completed
                            let quests_completed = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/quests/completed?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.quests_completed = await quests_completed.data;
                            //Reputations
                            let reputations = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/reputations?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.reputations = await reputations.data;
                            //Specializations
                            let specializations = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/specializations?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.specializations = await specializations.data;
                            //Statistics (Characters Stats)
                            let statistics = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/statistics?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.statistics = await statistics.data;
                            //Titles
                            let titles = await axios.get(`https://us.api.blizzard.com/profile/wow/character/${guildCharObj.character.realm.slug}/${encodeURI(guildCharObj.character.lowerName)}/titles?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`);
                            charData.titles = await titles.data;
                            
                            return charData;
                        }

                        //Exclude Characters with an in-game rank of Inactive (6) or characters below level 20
                        if (rank <= 5 && upsertObj.character.level >= 20) {
                            console.log(upsertObj.character.name);
                            upsertObj.character.lowerName = upsertObj.character.name.toLowerCase();
                            //Hit Status before asking for more character data
                            axios.get(`https://us.api.blizzard.com/profile/wow/character/${upsertObj.character.realm.slug}/${encodeURI(upsertObj.character.lowerName)}/status?namespace=profile-us&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(charStatus => {

                                //Is the character valid for data retrieval?
                                if (charStatus.data.is_valid) {
                                    
                                    //Check to see if ID already exists.
                                    db.characters.findOne({id: charStatus.data.id}).then(findRes => {
                                        //If ID doesn't exist, create a row and then update it. Otherwise update.
                                        if (!findRes) {
                                            db.characters.insert({
                                                id: charStatus.data.id,
                                                charname: upsertObj.character.name,
                                                charrealm: upsertObj.character.realm.slug,
                                                achievements: {},
                                                achievement_stats: {},
                                                appearance: {},
                                                collections_mounts: {},
                                                collections_pets: {},
                                                encounter_dungeons: {},
                                                encounter_raids: {},
                                                equipment: {},
                                                hunter_pets: {},
                                                media: {},
                                                mythic_keystone: {},
                                                mythic_keystone_seasonal: {},
                                                professions: {},
                                                profile_summary: {},
                                                pvp_2v2: {},
                                                pvp_3v3: {},
                                                pvp_summary: {},
                                                quests: {},
                                                quests_completed: {},
                                                reputations: {},
                                                specializations: {},
                                                stats: {},
                                                titles: {}
                                            }).then(dbInsert => {
                                                console.log(`Row created, inserting... ${charStatus.data.id} ${upsertObj.character.name} ${upsertObj.character.realm.slug}`)

                                                getCharData(upsertObj, charStatus).then(asyncData => {
                            
                                                    db.characters.update(asyncData.id, {
                                                        charname: asyncData.charname,
                                                        charrealm: asyncData.charrealm,
                                                        achievements: asyncData.achievements,
                                                        achievement_stats: asyncData.achievementStats,
                                                        appearance: asyncData.appearance,
                                                        collections_mounts: asyncData.mounts,
                                                        collections_pets: asyncData.pets,
                                                        encounter_dungeons: asyncData.dungeons,
                                                        encounter_raids: asyncData.raids,
                                                        equipment: asyncData.equipment,
                                                        hunter_pets: asyncData.hunterPets,
                                                        media: asyncData.media,
                                                        mythic_keystone: asyncData.mythicKeystone,
                                                        mythic_keystone_seasonal: {},
                                                        professions: asyncData.professions,
                                                        profile_summary: asyncData.profile,
                                                        pvp_2v2: asyncData.pvp_2v2,
                                                        pvp_3v3: asyncData.pvp_3v3,
                                                        pvp_summary: asyncData.pvp_summary,
                                                        quests: asyncData.quests,
                                                        quests_completed: asyncData.quests_completed,
                                                        reputations: asyncData.reputations,
                                                        specializations: asyncData.specializations,
                                                        stats: asyncData.statistics,
                                                        titles: asyncData.titles
                                                    }).then(dbCharStatus => {
                                                        console.log('Character Data inserted. ---->', dbCharStatus.id, dbCharStatus.charname, dbCharStatus.charrealm);
                                                        if (inserted) {
                                                            insertedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug});
                                                        } else {
                                                            updatedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug});
                                                        }
                                                    }).catch(insertError => {
                                            
                                                        let dbInsertError = {
                                                            dbError: insertError,
                                                            dataObject: upsertObj
                                                        };
                                            
                                                        //Log to database an error in updating a character.
                                                        ServicesLogging(db, 'database', `Error inserting ${upsertObj.character.name} of ${upsertObj.character.realm.slug}.`, dbInsertError);
                                            
                                                    });
                                            
                                                }).catch(error => {
                                                    console.log('ASYNC ERROR!!!!! ', upsertObj.character.name, error.response.status, error.response.statusText);
                                                    skippedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug, rank: upsertObj.rank});
                                                });

                                            }).catch(dbInsertErr => {
                                                console.log(dbInsertErr);
                                            });
                                        } else {
                                            console.log(`Row found, updating... ${charStatus.data.id} ${upsertObj.character.name} ${upsertObj.character.realm.slug}`);
                                            
                                            getCharData(upsertObj, charStatus).then(asyncData => {
                            
                                                db.characters.update(asyncData.id, {
                                                    charname: asyncData.charname,
                                                    charrealm: asyncData.charrealm,
                                                    achievements: asyncData.achievements,
                                                    achievement_stats: asyncData.achievementStats,
                                                    appearance: asyncData.appearance,
                                                    collections_mounts: asyncData.mounts,
                                                    collections_pets: asyncData.pets,
                                                    encounter_dungeons: asyncData.dungeons,
                                                    encounter_raids: asyncData.raids,
                                                    equipment: asyncData.equipment,
                                                    hunter_pets: asyncData.hunterPets,
                                                    media: asyncData.media,
                                                    mythic_keystone: asyncData.mythicKeystone,
                                                    mythic_keystone_seasonal: {},
                                                    professions: asyncData.professions,
                                                    profile_summary: asyncData.profile,
                                                    pvp_2v2: asyncData.pvp_2v2,
                                                    pvp_3v3: asyncData.pvp_3v3,
                                                    pvp_summary: asyncData.pvp_summary,
                                                    quests: asyncData.quests,
                                                    quests_completed: asyncData.quests_completed,
                                                    reputations: asyncData.reputations,
                                                    specializations: asyncData.specializations,
                                                    stats: asyncData.statistics,
                                                    titles: asyncData.titles
                                                }).then(dbCharStatus => {
                                                    console.log('Character Data inserted. ---->', dbCharStatus.id, dbCharStatus.charname, dbCharStatus.charrealm);
                                                    if (inserted) {
                                                        insertedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug});
                                                    } else {
                                                        updatedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug});
                                                    }
                                                }).catch(insertError => {
                                        
                                                    let dbInsertError = {
                                                        dbError: insertError,
                                                        dataObject: upsertObj
                                                    };
                                        
                                                    //Log to database an error in updating a character.
                                                    ServicesLogging(db, 'database', `Error inserting ${upsertObj.character.name} of ${upsertObj.character.realm.slug}.`, dbInsertError);
                                        
                                                });
                                        
                                            }).catch(error => {
                                                console.log('ASYNC ERROR!!!!! ', upsertObj.character.name, error.response.status, error.response.statusText);
                                                skippedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug, rank: upsertObj.rank});
                                            });
                                        }
                                    }).catch(dbFindErr => {
                                        console.log('Error when trying to find Character with ID.', dbFindErr);
                                    });

                                } else {
                                    //Log as Skipped Character due to opt out
                                    skippedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug, rank: upsertObj.rank});
                                }

                            }).catch(charStatusError => {
                                ServicesLogging(db, 'blizzardapi', 'Guild Member Status API error.', charStatusError.response);
                            });

                        } else {
                            skippedMembers.push({name: upsertObj.character.name, realm: upsertObj.character.realm.slug, rank: upsertObj.rank});
                        }

                        if (skippedMembers.length + updatedMembers.length + insertedMembers.length === memberCount) {
                            ServicesLogging(
                                db, 
                                'database', 
                                `${updatedMembers.length} character(s) updated. ${insertedMembers.length} character(s) inserted. ${skippedMembers.length} character(s) skipped.`, 
                                {membersUpdated: updatedMembers, membersInserted: insertedMembers, membersSkipped: skippedMembers}
                            );
                        }
                    }, index * 1000); //Timeout limits the WoW Character API calls to roughly 1 a second to avoid the 100 per second quota
                }

                //Run Closure Function
                upsert(obj, i, obj.rank);
            });
        }).catch(err => {
            ServicesLogging(db, 'blizzardapi', 'Guild Member API error.', err);
        });
    }, null, true, 'America/Denver', null, true),

    cleanup: (db) => new CronJob('00 23 0-23 * * 0-6', () => {

        ServicesLogging(db, 'database', 'Guild Member Cleanup Started');

        let cutoffDate = new Date().getTime() - 7200000;

        db.characters.destroy({"cron_updated <": cutoffDate}).then(delResponse => {
            ServicesLogging(db, 'database', `${delResponse.length} character(s) removed.`, delResponse);
        }).catch(delError => {
            ServicesLogging(db, 'database', 'Guild Member Cleanup error.', delError);
        });

    }, 
    null,
    true,
    'America/Denver'
    ),
}