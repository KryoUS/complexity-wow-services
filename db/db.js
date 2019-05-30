const massive = require('massive');

let db;

exports = module.exports = function () {
  if (db) {
    return db;
  }

  return massive({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: true
}).then(instance => {
    db = instance;

    return Promise.resolve(db);
  }).catch(error => {
    console.log('Massive Error: ', error)
  });
};