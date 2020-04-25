let localConfig;
try{
 localConfig = require('./config.local.js');
 console.info('Using Local config from config.local.js', localConfig);
}
catch(err)
{
  console.info('No local config file, using environment');
}

const config = localConfig || {
  "production": {

  },
  "development": {

  },
  "all": {
  }
};

module.exports = { ...config['all'], ...config[process.env.NODE_ENV || 'development'] };
