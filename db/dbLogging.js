//Discord Bot Logging
module.exports = (db, category, message, errorJSON) => {
    db.charactercronlog.insert({ 
        epoch_datetime: new Date().getTime(),
        category: category,  
        message: message,
        error: errorJSON ? errorJSON : '{}'
    }).then(result => {
        //Do nothing with results
    }).catch(error => {
        console.log(`${new Date()} Massive.js DiscordBotLogging Insert Error = `, error);
    })
};
