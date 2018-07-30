const massive = require('massive');
const axios = require('axios');
const CronJob = require('cron').CronJob;

//WoW API Key and PostgreSQL Connection Info
const { apikey, postgresql } = require('./config.json');

//Define WoW Guild API
const guildApi = `https://us.api.battle.net/wow/guild/Thunderlord/Complexity?fields=members%2Cnews&locale=en_US&apikey=${apikey}`;

//Counts for Logging
let insertCount = 0;
let updateCount = 0;

//Begin Cron function
const characterCron = new CronJob('00 00 18 * * 0-6', () => {
    const now = new Date();
    console.log(`Ran: ${now}`);

    //WoW Characters API currently fails if the character's account is no longer active
    let statAPIFail = 0;    

    //Begin Massive connection
    massive({
        host: postgresql.host,
        port: postgresql.port,
        database: postgresql.database,
        user: postgresql.user,
        password: postgresql.password,
        ssl: true
    }).then(db => {
        console.log('PostgreSQL Connection Established');

        //Begin WoW Guild API call
        axios.get(guildApi).then(guildRes => {
            
            //Define the current time, as Epoch, for the last updated table column
            const dateTime = new Date().getTime();
            console.log('WoW Guild Api Responded');
            console.log('Working with tables and WoW Character API...');

            //Loop over guild members array
            guildRes.data.members.forEach((obj, i) => {

                    //Begin Closure Function to ensure the 100 calls a second quota is not reached for the WoW API
                    const upsert = (upsertObj, index) => {
                        setTimeout(() => {
                            //Define WoW Character API
                            const statApi = `https://us.api.battle.net/wow/character/${upsertObj.character.realm}/${upsertObj.character.name}?fields=statistics&locale=en_US&apikey=${apikey}`;

                            //Begin WoW Character API call
                            axios.get(statApi).then(statRes => {
                                
                                //Blizzard's API had some values that were a max integer for seemingly no reason
                                //This section will ensure that those erroneous values are not inserted into the database
                                let personalTeam5v5 = 0;
                                let personalTeam3v3 = 0;
                                let personalTeam2v2 = 0;
                                if (statRes.data.statistics.subCategories[9].subCategories[0].statistics[25].quantity < 9999) {
                                    personalTeam5v5 = statRes.data.statistics.subCategories[9].subCategories[0].statistics[25].quantity
                                }
                                if (statRes.data.statistics.subCategories[9].subCategories[0].statistics[26].quantity < 9999) {
                                    personalTeam3v3 = statRes.data.statistics.subCategories[9].subCategories[0].statistics[26].quantity
                                }
                                if (statRes.data.statistics.subCategories[9].subCategories[0].statistics[27].quantity < 9999) {
                                    personalTeam2v2 = statRes.data.statistics.subCategories[9].subCategories[0].statistics[27].quantity
                                }
                                
                                //Begin Object that will be inserted or updated using Massive
                                let dataObj = {};

                                //If statement used to create two different objects
                                //One for characters that have a spec object, and one for those who don't
                                //This also avoids an issue where characters without a spec object also did not have any render images
                                if (upsertObj.character.spec) {
                                    //Character has a spec object
                                    const avatar = upsertObj.character.thumbnail;
                                    const avatarSmall = `http://render-us.worldofwarcraft.com/character/${avatar}`;
                                    const avatarMed = `http://render-us.worldofwarcraft.com/character/${avatar.replace('avatar', 'inset')}`;
                                    const avatarLarge = `http://render-us.worldofwarcraft.com/character/${avatar.replace('avatar', 'main')}`;
                                    dataObj = {
                                        character_name: upsertObj.character.name,
                                        realm: upsertObj.character.realm,
                                        guild: upsertObj.character.guild,
                                        rank: upsertObj.rank,
                                        class: upsertObj.character.class,
                                        race: upsertObj.character.race,
                                        level: upsertObj.character.level,
                                        achievements_pts: upsertObj.character.achievementPoints,
                                        avatar_small: avatarSmall,
                                        avatar_med: avatarMed,
                                        avatar_large: avatarLarge,
                                        spec_name: upsertObj.character.spec.name,
                                        spec_role: upsertObj.character.spec.role,
                                        spec_background_img: upsertObj.character.spec.backgroundImage,
                                        spec_icon: upsertObj.character.spec.icon,
                                        spec_desc: upsertObj.character.spec.description,
                                        last_updated: dateTime,
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
                                        stat_5v5_highest_team: personalTeam5v5,
                                        stat_3v3_highest_team: personalTeam3v3,
                                        stat_2v2_highest_team: personalTeam2v2,
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
                                } else {
                                    //Character does not have a spec object
                                    dataObj = {
                                        character_name: upsertObj.character.name,
                                        realm: upsertObj.character.realm,
                                        guild: upsertObj.character.guild,
                                        rank: upsertObj.rank,
                                        class: upsertObj.character.class,
                                        race: upsertObj.character.race,
                                        level: upsertObj.character.level,
                                        achievements_pts: upsertObj.character.achievementPoints,
                                        last_updated: dateTime,
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
                                        stat_5v5_highest_team: personalTeam5v5,
                                        stat_3v3_highest_team: personalTeam3v3,
                                        stat_2v2_highest_team: personalTeam2v2,
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
                                }

                                //Perform Massive insert to PostgreSQL
                                db.characters.insert(dataObj, {onConflictIgnore: true}).then(response => {
                                    //If there isn't a response, the character already exists and needs to be updated
                                    if (!response) {
                                        //Perform Massive update to PostgreSQL
                                        db.characters.update({character_name: upsertObj.character.name, realm: upsertObj.character.realm}, dataObj).then(updateRes => {
                                            //Increment counter for characters updated
                                            updateCount++
                                        }).catch(updateError => {
                                            console.log('---------------------------------------');
                                            console.log('Massive Update Error!');
                                            console.log(dataObj);
                                            console.log(updateError);
                                            console.log('---------------------------------------');
                                        });
                                    } else {
                                        //Increment counter for characters inserted
                                        insertCount++
                                    }
                                }).catch(insertError => {
                                    console.log('---------------------------------------');
                                    console.log('Massive Insert Error!');
                                    console.log(dataObj);
                                    console.log(insertError);
                                    console.log('---------------------------------------');
                                });
                            }).catch(statsError => {
                                //Increment WoW Character API Failure Counter
                                statAPIFail++

                                //The WoW Character API will fail if the character's account is not active
                                //There is also a bug with characters that have a special character in their name
                                console.log('---------------------------------------');
                                console.log(`Character API Failed (${statAPIFail}) times!`);
                                console.log(statsError.response.status, statsError.response.statusText);
                                console.log(statsError.response.config.headers);
                                console.log(statsError.response.config.url);
                                console.log('---------------------------------------');
                            });
                        }, index * 250); //Timeout limits the WoW Character API calls to roughly 4 a second to avoid the 100 per second quota
                    }

                    //Run Closure Function
                    upsert(obj, i);
            });
        }).catch(err => {
            console.log('WoW Guild Api Failed! ', err);
        });
    });
}, () => {
    //This doesn't seem to work, but should be running after the Cron finishes (https://www.npmjs.com/package/cron)
    console.log(`(${insertCount}) characters inserted, (${updateCount}) characters updated`);

    //Reset counters for next Cron
    insertCount = 0;
    updateCount = 0;
},
false,
'America/Denver'
);

//Starts Cron (This is necessary and the Cron will not run until the specified time)
characterCron.start();