var express = require('express'),
  config = require('./config/config'),
  mongoose = require('mongoose');

var fileManager = require('child_process').spawn('node', ['--harmony', '../node-file-manager/lib/index.js', '-p', '8000', '-d', '/home/ubuntu/MyDropbox/cloud/public/myDropboxFolder/']);

fileManager.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

var exports = module.exports = {};

var app = express();

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.on('open', function (params) {
  require('./config/express')(app, config);

  app.listen(config.port, function () {
    console.log('Express server listening on port ' + config.port);
  });
});

process.on('exit', function () {
  fileManager.kill();
});

exports.getDBInstance = function() {
  return mongoose;
}
