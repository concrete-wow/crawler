const initOptions = {
  // Get log information about actual queries performed.
  error: (err, e) => {
    //console.log('sql error: ', err, e.query);
  }

};
const pgp = require('pg-promise')(initOptions);
const config = require('../config');
const databaseVersion = 2;

const connection = {
  ...config.database
}

const db = pgp(connection);

db.one("SELECT value from parameters where name = 'version'")
  .then(row => {
    if (parseInt(row.value) !== databaseVersion) {
      console.error(`database schema version error, code expects ${databaseVersion} but database is at ${row.value}`);
      process.exit(-1);
    } else
      console.info(`Connected to Database ${config.database.database}`);
  })
  .catch(err => {
      console.error('Connecting to database: ', err);
      process.exit(-1);
    });

exports = module.exports = db;
