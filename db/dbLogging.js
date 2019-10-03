//Discord Bot Logging
const functions = require('../tools/functions');

module.exports = (db, category, message, errorJSON) => {
    db.serviceslog.insert({ 
        epoch_datetime: new Date().getTime(),
        category: category,  
        message: message,
        info: errorJSON ? JSON.stringify(errorJSON, functions.getCircularReplacer()) : '{}'
    }).then(result => {
        //Do nothing with results
    }).catch(error => {
        console.log(`${new Date()} Massive.js CharacterCronLogging Insert Error = `, error);
    })
};
