var fs = require('fs');
var mkdirp = require('mkdirp');
var os = require('os');
var pollingtoevent = require('polling-to-event');
var request = require('request-promise-native');
var rimraf = require('rimraf');
var watch = require('node-watch');

var watcher = watch('./myDropboxFolder');

var cloudUrl = 'ENDEREÇO DA CLOUD';

var isReceiving = false;
var lastPoll = [];
var prefix = __dirname + '/myDropboxFolder/';
var hostname = os.userInfo().username + '@' + os.hostname();

watcher.on('change', function (path) {
  var file = path.replace('myDropboxFolder/', '');

  if (!isReceiving || !fileFromCloud(lastPoll, file)) {
    if (fs.existsSync(path)) {
      if (fs.statSync(path).isFile()) {
        var options = {
          method: 'POST',
          uri: cloudUrl + 'api/sendFile',
          formData: {
            newFile: fs.createReadStream(path),
            path: file,
            hostname: hostname
          }
        };

        request(options).then(function (body) {
          console.log("Arquivo enviado com sucesso!");
        }).catch(function (err) {
          console.log(err);
        });
      } else {
        var options = {
          method: 'POST',
          uri: cloudUrl + 'api/sendFolder',
          formData: {
            path: file,
            hostname: hostname
          }
        };

        request(options).then(function (body) {
          console.log("Pasta criada com sucesso");
        }).catch(function (err) {
          console.log(err);
        });
      }
    } else {
      var options = {
        method: 'POST',
        uri: cloudUrl + 'api/removeFile',
        formData: {
          path: file
        }
      };

      request(options).then(function (body) {
        if (body) {
          console.log("Arquivo removido com sucesso!");
        }
      }).catch(function (err) {
        console.log(err);
      });
    }
  }
});

var emitter = pollingtoevent(function (done) {
  var options = {
    method: 'GET',
    uri: cloudUrl + 'api/getStatus',
    json: true
  };

  request(options).then(function (body) {
    done(null, body);
  }).catch(function (err) {
    done(err, null);
  });
}, {
    longpolling: true
  });

emitter.on("longpoll", function (data) {
  isReceiving = true;
  lastPoll = data;

  updateFiles(data, './').then(function (results) {
    isReceiving = false;
  }).catch(function (err) {
    console.log(err);
  });
});


function updateFiles(fileList, pathTo) {
  isReceiving = true;
  return Promise.all(fileList.map(function (file) {
    if (file.files) {
      mkdirp.sync(prefix + pathTo + file.name);
      return updateFiles(file.files, pathTo + file.name + '/');
    } else if (file.hostname != hostname) {
      if (!fs.existsSync(prefix + pathTo + file.name)) {
        var options = {
          method: 'POST',
          uri: cloudUrl + 'api/getFile',
          formData: {
            path: pathTo + file.name
          },
          encoding: null
        };

        return request(options).then(function (body) {
          fs.writeFileSync(prefix + pathTo + file.name, body);
          console.log('Arquivo salvo com sucesso!');
          return null
        });
      } else {
        return null;
      }
    }
  })).then(function (results) {
    var filesToRemove = fs.readdirSync(prefix + pathTo);
    return Promise.all(filesToRemove.filter(function (fileToRemove) {
      for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];

        if (file.name === fileToRemove) {
          if (fs.statSync(prefix + pathTo + fileToRemove).isDirectory() && file.files) {
            return false;
          } else if (fs.statSync(prefix + pathTo + fileToRemove).isFile() && !file.files) {
            return false;
          }
        }
      }

      return true;
    }));
  }).then(function (filesToRemove) {
    return Promise.all(filesToRemove.map(function (fileToRemove) {
      rimraf.sync(prefix + pathTo + fileToRemove);
      return null;
    }));
  });
}

function fileFromCloud(fileList, fileName) {
  var paths = fileName.split('/');

  if (paths.length > 1) {
    var actual = paths.shift();

    fileName = paths.join('/');

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];

      if (file.name === actual) {
        if (file.files) {
          return fileFromCloud(file.files, fileName);
        } else {
          return false;
        }
      }
    }

    return false;
  } else {
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];

      if (file.name === fileName) {
        if (file.files) {
          return false;
        } else {
          return true;
        }
      }
    }

    return false;
  }
}
