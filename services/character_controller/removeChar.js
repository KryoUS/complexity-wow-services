let getDb = require('../../db/db');

module.exports = async () => {

    const db = await getDb();

    db.query("DELETE FROM characters WHERE updated_at < NOW() - INTERVAL '1 days'").catch(error => {
        console.log(`${new Date()} ===Massive.js DB Bnet Log Cleanup Error===`, error);
    });
}
