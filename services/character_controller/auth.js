/*

Returns the status and a unique ID for a character. 
A client should delete information about a character from their application if any of the following conditions occur:

- an HTTP 404 Not Found error is returned
- the is_valid value is false
- the returned character ID doesn't match the previously recorded value for the character

The following example illustrates how to use this endpoint:
1. A client requests and stores information about a character, including its unique character ID and the timestamp of the request.
2. After 30 days, the client makes a request to the status endpoint to verify if the character information is still valid.
3. If character cannot be found, is not valid, or the characters IDs do not match, the client removes the information from their application.
4. If the character is valid and the character IDs match, the client retains the data for another 30 days.

https://develop.battle.net/documentation/world-of-warcraft/profile-apis

*/

const bnet = require('../../tools/axios/bnet');
const getCharAll = require('./getCharAll');

module.exports = (db, name, realm) => bnet.get(`/profile/wow/character/${realm}/${name}/status?namespace=profile-us&locale=en_US`).then(res => {

    if (res.data.id && res.data.is_valid) {
        //Continue Character Storage...
        //Check for existing id 
        db.characters.findDoc(res.data.id).then(data => {
            if (data) {
                db.characters.update(res.data.id, {is_valid: res.data.is_valid}).then(() => {
                    //Run gauntlet
                    getCharAll(db, res.data.id, name, realm);
                }).catch(error => {
                    //TODO: DB Errors go...?
                });
            } else {
                db.characters.insert({id: res.data.id, is_valid: res.data.is_valid}).then(() => {
                    //Run gauntlet
                    getCharAll(db, res.data.id, name, realm);
                }).catch(error => {
                    //TODO: DB Errors go...?
                });
            }
        }).catch(error => {
            //TODO: DB Errors go...?
        });
    }

}).catch(error => {
    
});
