//Discord Bot Logging

//Function to remove Circular Object references
const getCircularReplacer = () => {
    const seen = new WeakSet();

    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

module.exports = (db, category, message, errorJSON) => {
    db.charactercronlog.insert({ 
        epoch_datetime: new Date().getTime(),
        category: category,  
        message: message,
        error: errorJSON ? JSON.stringify(errorJSON, getCircularReplacer()) : '{}'
    }).then(result => {
        //Do nothing with results
    }).catch(error => {
        console.log(`${new Date()} Massive.js CharacterCronLogging Insert Error = `, error);
    })
};
