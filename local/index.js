var fs = require('fs');
var pollingtoevent = require('polling-to-event');
var request = require('request-promise-native');
var watch = require('node-watch');

var watcher = watch('./myDropboxFolder');

var cloudUrl = 'http://localhost:3000/';

var isReceiving = false;
var lastPoll = [];

watcher.on('change', function (path) {
  var file = path.replace('myDropboxFolder/', '');

  if (fs.existsSync(path)) {
    if (fs.statSync(path).isFile()) {
      var options = {
        method: 'POST',
        uri: cloudUrl + 'api/sendFile',
        formData: {
          newFile: fs.createReadStream(path),
          path: file
        }
      };

      request(options).then(function (body) {
        console.log(body);
      }).catch(function (err) {
        console.log(err);
      });
    } else {
      var options = {
        method: 'POST',
        uri: cloudUrl + 'api/sendFolder',
        formData: {
          path: file
        }
      };

      request(options).then(function (body) {
        console.log(body);
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
        console.log("Arquivo enviado com sucesso!");
      }
    }).catch(function (err) {
      console.log(err);
    });
  }
});

var emitter = pollingtoevent(function (done) {
  var options = {
    method: 'GET',
    uri: cloudUrl + 'api/getStatus'
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

  updateFiles(data, __dirname + '/myDropboxFolder');
});

function updateFiles(fileList, pathTo) {
  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    
    if (file.files.length) {
      mkdirp.sync(pathTo + '/' + file.name);
      updateFiles(file.files, pathTo + '/' + file.name);
    } else {
      var clouDate = new Date(file.mtime);
      if ( !fs.existsSync(pathTo + file.name) || fs.statSync(pathTo + '/' + file.name).mtime.getTime() < clouDate.getTime() ) {
        var options = {
          method: 'POST',
          uri: cloudUrl + 'api/getFile',
          formData: {
            path: pathTo + '/' + file.name
          }
        };

        request(options).then(function (body) {
          fs.writeFileSync(pathTo + '/' + file.name, body);
        }).catch(function (err) {
          console.log(err);
        });
      }
    }
  }

  //TODO: Verificar entre os arquivos locais desse nível (pathTo) se está na lista recebida, se não estiver, deletar. (Tip: Usar Array.prototype.map)
}