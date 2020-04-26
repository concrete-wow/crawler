let localConfig;
try {
  localConfig = require('./config.local.js');
  console.info('Using Local config from config.local.js', localConfig);
} catch (err) {
  console.info('No local config file, using environment');
}

const config = localConfig || {
  "production": {

  },
  "development": {

  },
  "all": {
    api_key: process.env.APIKEY,
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        key: process.env.CLIENT_KEY + '\n',
        cert: process.env.CLIENT_CERT + '\n',
        ca: process.env.CA_CERT + '\n',
        rejectUnauthorized: false
      }

    }
  }
};

// Stateless containers meets stateful databases is always a train crash.
// We are no different.
// This a fudge around the fact that it is hard to use a proper database connection
// with GCP cloud run (containers) due to the secrets we have to pass for client authed
// SSL connections. This is really the only way to do psql on the Internet.
// So we do UNIX domain SQL socket to access our DB in their environment with
// a database connector that they provide.
gcloud_patch = (process.env.INSTANCE_CONNECTION_NAME) ? {
    database: {
      host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  } :
  {};

exports = module.exports = { ...config['all'], ...config[process.env.NODE_ENV || 'development'], ...gcloud_patch };
