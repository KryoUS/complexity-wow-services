const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../db/dbLogging');

module.exports = {
    get: (db) => new CronJob('00 13 0-23 * * 0-6', () => {

        if (process.env.BLIZZ_TOKEN === '') {
            ServicesLogging(db, 'system', 'Blizzard API Token not present, character cron skipped.');
            return
        }

        //WoW Characters API fail counter
        let statAPIFail = 0; 

        //Begin WoW Guild API call
        axios.get(`https://us.api.blizzard.com/wow/guild/thunderlord/complexity?fields=members&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(guildRes => {

            ServicesLogging(db, 'blizzardapi', 'Complexity Guild Members acquired.');

            //Define the current time, as Epoch, for the last updated table column
            let dateTime = new Date().getTime();

            let memberCount = guildRes.data.members.length;
            let updatedMembers = [];
            let insertedMembers = [];
            let skippedMembers = [];

            //Loop over guild members array
            guildRes.data.members.forEach((obj, i) => {

                //Begin Closure Function to ensure the 100 calls a second quota is not reached for the WoW API
                const upsert = (upsertObj, index, rank) => {

                    setTimeout(() => {

                        //Exclude Characters with an in-game rank of Inactive (6) and characters that are ghosts in the wow character api
                        if (obj.rank <= 5 
                            && obj.character.name !== 'Judgnjury' 
                            && obj.character.name !== 'Reaperdgrim' 
                            && obj.character.name !== 'Luckydawg' 
                            && obj.character.name !== 'Dawgbreath' 
                            && obj.character.name !== 'Youlldie' 
                            && obj.character.name !== 'Misundrstood'
                            && obj.character.level >= 20
                        ) {
                            //Define WoW Character API
                            let avatarSmall = `https://render-us.worldofwarcraft.com/character/${upsertObj.character.thumbnail}?alt=/wow/static/images/2d/avatar/${upsertObj.character.race}-${upsertObj.character.gender}.jpg`;
                            let avatarMed = `https://render-us.worldofwarcraft.com/character/${upsertObj.character.thumbnail.replace('avatar', 'inset')}?alt=/wow/static/images/2d/inset/${upsertObj.character.race}-${upsertObj.character.gender}.jpg`;
                            let avatarLarge = `https://render-us.worldofwarcraft.com/character/${upsertObj.character.thumbnail.replace('avatar', 'main')}?alt=/wow/static/images/2d/main/${upsertObj.character.race}-${upsertObj.character.gender}.jpg`;

                            //Begin WoW Character API call
                            axios.get(`https://us.api.blizzard.com/wow/character/${upsertObj.character.realm}/${encodeURI(upsertObj.character.name)}?fields=items%2C%20statistics&locale=en_US&access_token=${process.env.BLIZZ_TOKEN}`).then(statRes => {
                                
                                let raider = 0;
                                if (rank <= 3 && upsertObj.character.name != 'Theeotown' && upsertObj.character.name != 'Glacial' && upsertObj.character.name != 'Hopelessly' && upsertObj.character.name != 'Tanzia' && upsertObj.character.name != 'Rubyeyes' && upsertObj.character.name != 'Cheezyjr') {
                                    raider = 1;
                                }

                                //Begin Object that will be inserted or updated using Massive
                                let dataObj = {
                                    character_name: upsertObj.character.name,
                                    realm: upsertObj.character.realm,
                                    guild: upsertObj.character.guild,
                                    rank: upsertObj.rank,
                                    class: upsertObj.character.class,
                                    race: upsertObj.character.race,
                                    level: upsertObj.character.level,
                                    achievements_pts: upsertObj.character.achievementPoints,
                                    average_ilvl: statRes.data.items.averageItemLevel,
                                    average_equipped_ilvl: statRes.data.items.averageItemLevelEquipped,
                                    azerite_lvl: statRes.data.items.neck && statRes.data.items.neck.name === 'Heart of Azeroth' ? statRes.data.items.neck.azeriteItem.azeriteLevel : 0,
                                    azerite_xp: statRes.data.items.neck && statRes.data.items.neck.name === 'Heart of Azeroth' ? statRes.data.items.neck.azeriteItem.azeriteExperience : 0,
                                    azerite_xp_remaining: statRes.data.items.neck && statRes.data.items.neck.name === 'Heart of Azeroth' ? statRes.data.items.neck.azeriteItem.azeriteExperienceRemaining : 0,
                                    last_updated: statRes.data.lastModified,
                                    cron_updated: dateTime,
                                    raider: raider,
                                    avatar_small: avatarSmall,
                                    avatar_med: avatarMed,
                                    avatar_large: avatarLarge,
                                    spec_name: upsertObj.character.spec ? upsertObj.character.spec.name : null,
                                    spec_role: upsertObj.character.spec ? upsertObj.character.spec.role : null,
                                    spec_background_img: upsertObj.character.spec ? upsertObj.character.spec.backgroundImage : null,
                                    spec_icon: upsertObj.character.spec ? upsertObj.character.spec.icon : null,
                                    spec_desc: upsertObj.character.spec ? upsertObj.character.spec.description : null,
                                    stat_health_pots: statRes.data.statistics.subCategories[0].subCategories[0].statistics[3].quantity,
                                    stat_mana_pots: statRes.data.statistics.subCategories[0].subCategories[0].statistics[6].quantity,
                                    stat_elixirs: statRes.data.statistics.subCategories[0].subCategories[0].statistics[9].quantity,
                                    stat_flasks: statRes.data.statistics.subCategories[0].subCategories[0].statistics[12].quantity,
                                    stat_drinks: statRes.data.statistics.subCategories[0].subCategories[0].statistics[15].quantity,
                                    stat_foods: statRes.data.statistics.subCategories[0].subCategories[0].statistics[18].quantity,
                                    stat_healthstones: statRes.data.statistics.subCategories[0].subCategories[0].statistics[21].quantity,
                                    stat_exhaulted_reps: statRes.data.statistics.subCategories[0].subCategories[1].statistics[0].quantity,
                                    stat_epics: statRes.data.statistics.subCategories[0].subCategories[2].statistics[5].quantity,
                                    stat_mounts: statRes.data.statistics.subCategories[0].subCategories[2].statistics[7].quantity,
                                    stat_greed_rolls: statRes.data.statistics.subCategories[0].subCategories[2].statistics[9].quantity,
                                    stat_need_rolls: statRes.data.statistics.subCategories[0].subCategories[2].statistics[10].quantity,
                                    stat_damage_done: statRes.data.statistics.subCategories[1].statistics[2].quantity,
                                    stat_damage_received: statRes.data.statistics.subCategories[1].statistics[3].quantity,
                                    stat_healing_done: statRes.data.statistics.subCategories[1].statistics[6].quantity,
                                    stat_healing_received: statRes.data.statistics.subCategories[1].statistics[7].quantity,
                                    stat_total_kills: statRes.data.statistics.subCategories[2].statistics[0].quantity,
                                    stat_creature_kills: statRes.data.statistics.subCategories[2].subCategories[0].statistics[0].quantity,
                                    stat_critter_kills: statRes.data.statistics.subCategories[2].subCategories[0].statistics[3].quantity,
                                    stat_honor_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[0].quantity,
                                    stat_world_honor_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[1].quantity,
                                    stat_arena_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[3].quantity,
                                    stat_2v2_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[6].quantity,
                                    stat_3v3_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[7].quantity,
                                    stat_5v5_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[8].quantity,
                                    stat_bg_kills: statRes.data.statistics.subCategories[2].subCategories[1].statistics[4].quantity,
                                    stat_arena_kbs: statRes.data.statistics.subCategories[2].subCategories[2].statistics[3].quantity,
                                    stat_bg_kbs: statRes.data.statistics.subCategories[2].subCategories[2].statistics[4].quantity,
                                    stat_2v2_kbs: statRes.data.statistics.subCategories[2].subCategories[2].statistics[6].quantity,
                                    stat_3v3_kbs: statRes.data.statistics.subCategories[2].subCategories[2].statistics[7].quantity,
                                    stat_5v5_kbs: statRes.data.statistics.subCategories[2].subCategories[2].statistics[8].quantity,
                                    stat_total_deaths: statRes.data.statistics.subCategories[3].statistics[0].quantity,
                                    stat_2v2_deaths: statRes.data.statistics.subCategories[3].subCategories[0].statistics[0].quantity,
                                    stat_3v3_deaths: statRes.data.statistics.subCategories[3].subCategories[0].statistics[1].quantity,
                                    stat_5v5_deaths: statRes.data.statistics.subCategories[3].subCategories[0].statistics[2].quantity,
                                    stat_av_drek_deaths: statRes.data.statistics.subCategories[3].subCategories[1].statistics[10].quantity,
                                    stat_av_vann_deaths: statRes.data.statistics.subCategories[3].subCategories[1].statistics[11].quantity,
                                    stat_normal_dungeon_deaths: statRes.data.statistics.subCategories[3].subCategories[2].statistics[1].quantity,
                                    stat_heroic_dungeon_deaths: statRes.data.statistics.subCategories[3].subCategories[2].statistics[2].quantity,
                                    stat_raid_deaths: statRes.data.statistics.subCategories[3].subCategories[2].statistics[3].quantity,
                                    stat_drowning_deaths: statRes.data.statistics.subCategories[3].subCategories[3].statistics[0].quantity,
                                    stat_hogger_deaths: statRes.data.statistics.subCategories[3].subCategories[3].statistics[1].quantity,
                                    stat_fatigue_deaths: statRes.data.statistics.subCategories[3].subCategories[3].statistics[2].quantity,
                                    stat_falling_deaths: statRes.data.statistics.subCategories[3].subCategories[3].statistics[3].quantity,
                                    stat_fire_or_lava_deaths: statRes.data.statistics.subCategories[3].subCategories[3].statistics[4].quantity,
                                    stat_rebirths: statRes.data.statistics.subCategories[3].subCategories[4].statistics[1].quantity,
                                    stat_raised: statRes.data.statistics.subCategories[3].subCategories[4].statistics[5].quantity,
                                    stat_soulstones: statRes.data.statistics.subCategories[3].subCategories[4].statistics[7].quantity,
                                    stat_quest_completed: statRes.data.statistics.subCategories[4].statistics[0].quantity,
                                    stat_quest_dailies: statRes.data.statistics.subCategories[4].statistics[2].quantity,
                                    stat_quest_abandoned: statRes.data.statistics.subCategories[4].statistics[4].quantity,
                                    stat_cata_dungeons_completed: statRes.data.statistics.subCategories[5].statistics[14].quantity,
                                    stat_panda_dungeons_completed: statRes.data.statistics.subCategories[5].statistics[16].quantity,
                                    stat_wod_dungeons_completed: statRes.data.statistics.subCategories[5].statistics[22].quantity,
                                    stat_legion_dungeons_completed: statRes.data.statistics.subCategories[5].statistics[28].quantity,
                                    stat_challenge_modes_completed: statRes.data.statistics.subCategories[5].statistics[34].quantity,
                                    stat_cata_raids_completed: statRes.data.statistics.subCategories[5].statistics[15].quantity,
                                    stat_panda_raids_completed: statRes.data.statistics.subCategories[5].statistics[19].quantity,
                                    stat_wod_raids_completed: statRes.data.statistics.subCategories[5].statistics[25].quantity,
                                    stat_legion_raids_completed: statRes.data.statistics.subCategories[5].statistics[31].quantity,
                                    stat_prof_learned: statRes.data.statistics.subCategories[6].statistics[0].quantity,
                                    stat_prof_maxed: statRes.data.statistics.subCategories[6].statistics[1].quantity,
                                    stat_secondary_prof_maxed: statRes.data.statistics.subCategories[6].statistics[2].quantity,
                                    stat_cooking_recipes: statRes.data.statistics.subCategories[6].subCategories[0].statistics[2].quantity,
                                    stat_fish_caught: statRes.data.statistics.subCategories[6].subCategories[0].statistics[7].quantity,
                                    stat_alch_recipes: statRes.data.statistics.subCategories[6].subCategories[1].statistics[1].quantity,
                                    stat_blacksmith_plans: statRes.data.statistics.subCategories[6].subCategories[1].statistics[3].quantity,
                                    stat_enchants: statRes.data.statistics.subCategories[6].subCategories[1].statistics[5].quantity,
                                    stat_disenchants: statRes.data.statistics.subCategories[6].subCategories[1].statistics[7].quantity,
                                    stat_engi_schematics: statRes.data.statistics.subCategories[6].subCategories[1].statistics[9].quantity,
                                    stat_inscriptions: statRes.data.statistics.subCategories[6].subCategories[1].statistics[12].quantity,
                                    stat_jewel_designs: statRes.data.statistics.subCategories[6].subCategories[1].statistics[14].quantity,
                                    stat_leather_patterns: statRes.data.statistics.subCategories[6].subCategories[1].statistics[17].quantity,
                                    stat_smelting_recipes: statRes.data.statistics.subCategories[6].subCategories[1].statistics[19].quantity,
                                    stat_tailor_patterns: statRes.data.statistics.subCategories[6].subCategories[1].statistics[22].quantity,
                                    stat_flight_paths: statRes.data.statistics.subCategories[7].statistics[0].quantity,
                                    stat_summons: statRes.data.statistics.subCategories[7].statistics[1].quantity,
                                    stat_mage_portals: statRes.data.statistics.subCategories[7].statistics[2].quantity,
                                    stat_hearthstones: statRes.data.statistics.subCategories[7].statistics[4].quantity,
                                    stat_hugs: statRes.data.statistics.subCategories[8].statistics[0].quantity,
                                    stat_facepalms: statRes.data.statistics.subCategories[8].statistics[1].quantity,
                                    stat_small_viollins: statRes.data.statistics.subCategories[8].statistics[2].quantity,
                                    stat_lols: statRes.data.statistics.subCategories[8].statistics[3].quantity,
                                    stat_cheers: statRes.data.statistics.subCategories[8].statistics[4].quantity,
                                    stat_waves: statRes.data.statistics.subCategories[8].statistics[5].quantity,
                                    stat_pvp_deaths: statRes.data.statistics.subCategories[9].statistics[0].quantity,
                                    stat_horde_deaths: statRes.data.statistics.subCategories[9].statistics[1].quantity,
                                    stat_arenas_won: statRes.data.statistics.subCategories[9].subCategories[0].statistics[0].quantity,
                                    stat_arenas_played: statRes.data.statistics.subCategories[9].subCategories[0].statistics[1].quantity,
                                    stat_5v5_matches: statRes.data.statistics.subCategories[9].subCategories[0].statistics[2].quantity,
                                    stat_5v5_won: statRes.data.statistics.subCategories[9].subCategories[0].statistics[3].quantity,
                                    stat_3v3_matches: statRes.data.statistics.subCategories[9].subCategories[0].statistics[4].quantity,
                                    stat_3v3_won: statRes.data.statistics.subCategories[9].subCategories[0].statistics[5].quantity,
                                    stat_2v2_matches: statRes.data.statistics.subCategories[9].subCategories[0].statistics[6].quantity,
                                    stat_2v2_won: statRes.data.statistics.subCategories[9].subCategories[0].statistics[7].quantity,
                                    stat_5v5_highest_personal: statRes.data.statistics.subCategories[9].subCategories[0].statistics[22].quantity,
                                    stat_3v3_highest_personal: statRes.data.statistics.subCategories[9].subCategories[0].statistics[23].quantity,
                                    stat_2v2_highest_personal: statRes.data.statistics.subCategories[9].subCategories[0].statistics[24].quantity,
                                    stat_5v5_highest_team: statRes.data.statistics.subCategories[9].subCategories[0].statistics[25].quantity < 9999 ? statRes.data.statistics.subCategories[9].subCategories[0].statistics[25].quantity : 0,
                                    stat_3v3_highest_team: statRes.data.statistics.subCategories[9].subCategories[0].statistics[26].quantity < 9999 ? statRes.data.statistics.subCategories[9].subCategories[0].statistics[26].quantity : 0,
                                    stat_2v2_highest_team: statRes.data.statistics.subCategories[9].subCategories[0].statistics[27].quantity < 9999 ? statRes.data.statistics.subCategories[9].subCategories[0].statistics[27].quantity : 0,
                                    stat_bgs_played: statRes.data.statistics.subCategories[9].subCategories[1].statistics[0].quantity,
                                    stat_bgs_won: statRes.data.statistics.subCategories[9].subCategories[1].statistics[2].quantity,
                                    stat_rbgs_played: statRes.data.statistics.subCategories[9].subCategories[1].statistics[35].quantity,
                                    stat_rbgs_won: statRes.data.statistics.subCategories[9].subCategories[1].statistics[37].quantity,
                                    stat_duels_won: statRes.data.statistics.subCategories[9].subCategories[2].statistics[0].quantity,
                                    stat_duels_lost: statRes.data.statistics.subCategories[9].subCategories[2].statistics[1].quantity,
                                    stat_pets: statRes.data.statistics.subCategories[10].statistics[0].quantity,
                                    stat_pet_battles_won: statRes.data.statistics.subCategories[10].statistics[1].quantity,
                                    stat_pvp_pet_battles_won: statRes.data.statistics.subCategories[10].statistics[2].quantity,
                                    stat_pvp_fullteam_pet_battles_won: statRes.data.statistics.subCategories[10].statistics[3].quantity,
                                    stat_pet_celestial_tour_won: statRes.data.statistics.subCategories[10].statistics[4].quantity,
                                    stat_highest_endless_dmg: statRes.data.statistics.subCategories[11].statistics[0].quantity,
                                    stat_highest_endless_tank: statRes.data.statistics.subCategories[11].statistics[1].quantity,
                                    stat_highest_endless_heals: statRes.data.statistics.subCategories[11].statistics[2].quantity
                                };

                                //Perform Massive insert to PostgreSQL
                                db.characters.insert(dataObj, {onConflictIgnore: true}).then(response => {
                                    //If there isn't a response, the character already exists and needs to be updated
                                    if (!response) {

                                        //Perform Massive update to PostgreSQL
                                        db.characters.update({character_name: upsertObj.character.name, realm: upsertObj.character.realm}, dataObj).then(updateRes => {

                                            //Add character as an updated character to the array for logging later
                                            updatedMembers.push({name: dataObj.character_name, realm: dataObj.realm});

                                        }).catch(updateError => {
                                            let dbUpdateError = {};
                                            dbUpdateError.dbError = updateError;
                                            dbUpdateError.dataObject = dataObj;

                                            //Log to database an error in updating a character.
                                            ServicesLogging(db, 'database', `Error updating ${dataObj.character_name} of ${dataObj.realm}.`, dbUpdateError);

                                        });
                                    } else {

                                        //Add character as an inserted character to the array for logging later
                                        insertedMembers.push({name: dataObj.character_name, realm: dataObj.realm});
                                    }
                                }).catch(insertError => {

                                    let dbInsertError = {};
                                    dbInsertError.dbError = insertError;
                                    dbInsertError.dataObject = dataObj;

                                    //Log to database an error in updating a character.
                                    ServicesLogging(db, 'database', `Error inserting ${dataObj.character_name} of ${dataObj.realm}.`, dbInsertError);

                                });

                            }).catch(statsError => {
                                //Increment WoW Character API Failure Counter
                                statAPIFail++

                                //The WoW Character API will fail if the character's account is not active
                                //There is also a bug with characters that have a special character in their name
                                ServicesLogging(db, 'blizzardapi', `Blizzard Character API failed ${statAPIFail} time(s). Character ${upsertObj.character.name} of ${upsertObj.character.realm} not found.`, JSON.stringify(statsError, getCircularReplacer()));

                            });
                        } else {
                            skippedMembers.push({name: obj.character.name, realm: obj.character.realm, rank: obj.rank});
                        }

                        if (skippedMembers.length + updatedMembers.length + insertedMembers.length === memberCount) {
                            ServicesLogging(
                                db, 
                                'database', 
                                `${updatedMembers.length} character(s) updated. ${insertedMembers.length} character(s) inserted. ${skippedMembers.length} character(s) skipped.`, 
                                {membersUpdated: updatedMembers, membersInserted: insertedMembers, membersSkipped: skippedMembers}
                            );
                        }
                    }, index * 500); //Timeout limits the WoW Character API calls to roughly 2 a second to avoid the 100 per second quota and Heroku Connection limits
                }

                //Run Closure Function
                upsert(obj, i, obj.rank);
            });
        }).catch(err => {
            ServicesLogging(db, 'blizzardapi', 'Guild Member API error.', err);
        });
    }, 
    null,
    true,
    'America/Denver'
    ),

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
    false,
    'America/Denver'
    ),
}