const axios = require('axios');
const CronJob = require('cron').CronJob;
const ServicesLogging = require('../db/dbLogging');

module.exports = {
    get: (db) => new CronJob('00 00 04 * * *', () => {
        const getCoreStat = (statsArr, keyword) => {
            let stat = statsArr.filter(val => val.includes(keyword));
            stat = parseInt(stat[0].substring(stat[0].indexOf('(') + 1, stat[0].indexOf(')')));
            if (stat > 0) { return stat }
            else {return 0}
        }
        
        const getCoreStatValueNoPercent = (statsArr, keyword) => {
            let stat = statsArr.filter(val => val.includes(keyword));
            stat = parseInt(stat[0].substring(stat[0].indexOf('=') + 1, stat[0].indexOf('|')));
            if (stat > 0) { return stat }
            else {return 0}
        }
        
        const getCoreStatPercent = (statsArr, keyword) => {
            let stat = statsArr.filter(val => val.includes(keyword));
            stat = parseFloat(stat[0].substring(stat[0].indexOf('=') + 1, stat[0].indexOf('%')));
            if (stat > 0) { return stat }
            else {return 0}
        }
        
        const simArray = (data) => {
            let dataArray = data.split("\n");
            let reportArray = [];
            let obj = {};
            let stop = false;
            return dataArray.map((str, index) => {
        
                //Stop collecting
                if (str.includes('*** Targets ***')) {
                    stop = true;
                }
        
                //Append Report Epoch Time to array
                if (str.includes('EndTime')) {
                    reportArray.forEach(obj => {
                        obj.reportDateTime = str.substring(str.indexOf('(') + 1, str.indexOf(')'));
                    })
                }
        
                //Collect base class info
                if (str.includes('Player: ')) {
                    let classInfo = str.replace('Player: ', '').split(' ');
                    obj = { 
                        simcraftVer: dataArray[0].substring(dataArray[0].indexOf('Craft') + 6, dataArray[0].indexOf('for') - 1),
                        patch: dataArray[0].substring(dataArray[0].indexOf('Warcraft') + 9, dataArray[0].indexOf('Live') - 1),
                        build: dataArray[0].substring(dataArray[0].indexOf('build') + 6, dataArray[0].indexOf(',')),
                        tier: classInfo[0].substring(0, 3).replace('_', ''),
                        race: classInfo[1], 
                        class: classInfo[2], 
                        spec: classInfo[3],
                        level: parseInt(classInfo[4])
                    }
                }
        
                //Get DPS
                if (str.includes('  DPS=') && stop === false) {
                    let dpsStr = str.replace('  DPS=', '');
                    obj.dps = Math.round(parseFloat(dpsStr.substring(0, dpsStr.indexOf('.') + 2)));
                }
        
                //Get apm
                if (str.includes('ApM=') && stop === false) {
                    obj.apm = parseFloat(str.substring(str.indexOf('ApM=') + 4));
                }
        
                //Get Talents
                if (str.includes('Talents: ') && stop === false) {
                    obj.talents = str.replace('Talents:', '').replace(/ /g, '').replace(/(?:\\[rn]|[\r\n]+)+/, '');
                }
        
                //Get Main Stats (Core Stats)
                if (str.includes('Core Stats: ') && stop === false) {
                    coreStats = str.replace('Core Stats: ', '').split(' ').filter(val => {return val !== ''});
                    obj.stat = { strength: getCoreStat(coreStats, 'strength=') };
                    obj.stat.agility = getCoreStat(coreStats, 'agility=');
                    obj.stat.stamina = getCoreStat(coreStats, 'stamina=');
                    obj.stat.intellect = getCoreStat(coreStats, 'intellect=');
                    obj.stat.spirit = getCoreStat(coreStats, 'spirit=');
                    obj.stat.health = getCoreStatValueNoPercent(coreStats, 'health=');
                    obj.stat.mana = getCoreStatValueNoPercent(coreStats, 'mana=');
                }
        
                //Get Tertiary Stats (Generic Stats)
                if (str.includes('Generic Stats: ') && stop === false) {
                    coreStats = str.replace('Generic Stats: ', '').split(' ').filter(val => {return val !== ''});
                    obj.stat.mastery = { value : getCoreStat(coreStats, 'mastery='), percent: getCoreStatPercent(coreStats, 'mastery=') };
                    obj.stat.versatility = { value: getCoreStat(coreStats, 'versatility='), percent: getCoreStatPercent(coreStats, 'versatility=') };
                    obj.stat.leech = { value: getCoreStat(coreStats, 'leech='), percent: getCoreStatPercent(coreStats, 'leech=') };
                    obj.stat.runspeed = { value: getCoreStat(coreStats, 'runspeed='), percent: getCoreStatPercent(coreStats, 'runspeed=') };
                }
        
                //Get Secondary Spell Stats (Spell Stats)
                if (str.includes('Spell Stats: ') && stop === false) {
                    coreStats = str.replace('Spell Stats: ', '').split(' ').filter(val => {return val !== ''});
                    obj.stat.spell = { power: getCoreStatValueNoPercent(coreStats, 'power=') };
                    obj.stat.spell.crit = { value: getCoreStat(coreStats, 'crit='), percent: getCoreStatPercent(coreStats, 'crit=') };
                    obj.stat.spell.haste = { value: getCoreStat(coreStats, 'haste='), percent: getCoreStatPercent(coreStats, 'haste=') };
                    obj.stat.spell.speed = { value: 0, percent: getCoreStatPercent(coreStats, 'speed=') };
                    obj.stat.spell.manareg = { value: getCoreStat(coreStats, 'manareg='), percent: getCoreStatPercent(coreStats, 'manareg=') };
                }
        
                //Get Secondary Melee Stats (Attack Stats)
                if (str.includes('Attack Stats: ') && stop === false) {
                    coreStats = str.replace('Attack Stats: ', '').split(' ').filter(val => {return val !== ''});
                    obj.stat.attack = { power: getCoreStatValueNoPercent(coreStats, 'power=') };
                    obj.stat.attack.crit = { value: getCoreStat(coreStats, 'crit='), percent: getCoreStatPercent(coreStats, 'crit=') };
                    obj.stat.attack.haste = { value: getCoreStat(coreStats, 'haste='), percent: getCoreStatPercent(coreStats, 'haste=') };
                    obj.stat.attack.speed = { value: 0, percent: getCoreStatPercent(coreStats, 'speed=') };
                }
        
                //Get Secondary Defense Stats
                if (str.includes('Defense Stats: ') && stop === false) {
                    coreStats = str.replace('Defense Stats: ', '').split(' ').filter(val => {return val !== ''});
                    obj.stat.defense = { armor: getCoreStat(coreStats, 'armor=') };
                    obj.stat.defense.dodge = { value: getCoreStat(coreStats, 'dodge='), percent: getCoreStatPercent(coreStats, 'dodge=') };
                    obj.stat.defense.parry = { value: getCoreStat(coreStats, 'parry='), percent: getCoreStatPercent(coreStats, 'parry=') };
                    obj.stat.defense.block = { value: getCoreStat(coreStats, 'block='), percent: getCoreStatPercent(coreStats, 'block=') };
                    obj.stat.defense.versatility = { value: getCoreStat(coreStats, 'versatility='), percent: getCoreStatPercent(coreStats, 'versatility=') };
                }
        
                //End Current Obj
                if (str.includes('Waiting: ') && stop === false) {
                    reportArray.push(obj);
                    obj = {};
                }
        
                //End Array Building -- TESTING ONLY
                if (str.includes('html report took') || index === 20) {
                    return reportArray;
                }
            });
        };
        
        axios.get('https://www.simulationcraft.org/reports/').then(res => {
            const fileName = res.data.slice(res.data.lastIndexOf("Raid.txt") - 4, res.data.lastIndexOf("Raid.txt") + 8);
        
            axios.get(`https://www.simulationcraft.org/reports/${fileName}`).then(curTierRes => {
                let currentTier = simArray(curTierRes.data).filter(Boolean);

                axios.get(`https://www.simulationcraft.org/reports/PR_Raid.txt`).then(pubRealmRes => {
                    let publicRealm = simArray(pubRealmRes.data).filter(Boolean);

                    db.wowcache.saveDoc({
                        id: 9,
                        cacheType: 'simulationcraft',
                        publicRealm: publicRealm[1],
                        currentTier: currentTier[1],
                    }).then(response => {
                        ServicesLogging(db, 'simulationcraft', `Data inserted.`);
                    }).catch(error => {
                        console.log(`Database Insertion Error: Simulationcraft Insert Failed.`, error);
                    });

                }).catch(publicRealmError => {
                    ServicesLogging(db, 'simulationcraft', `Data fetch error for publicrealm.`, publicRealmError);
                });

            }).catch(currentTierError => {
                ServicesLogging(db, 'simulationcraft', `Data fetch error for currenttier.`, currentTierError);
            });

        }).catch(reportError => {
            ServicesLogging(db, 'simulationcraft', `Report fetch error.`, reportError);
        });
    }, null, true, 'America/Denver', null, true),
};