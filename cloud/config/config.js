var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'mydropboxcloud'
    },
    port: process.env.PORT || 3000,
    database: 'mongodb://localhost/myDropbox'
  },

  test: {
    root: rootPath,
    app: {
      name: 'mydropboxcloud'
    },
    port: process.env.PORT || 3000,
    database: 'mongodb://localhost/myDropbox'
  },

  production: {
    root: rootPath,
    app: {
      name: 'mydropboxcloud'
    },
    port: process.env.PORT || 3000,
    database: 'mongodb://localhost/myDropbox'
  }
};

module.exports = config[env];
