var fs = require('fs');
var request = require('request-promise-native');
var watch = require('node-watch');

var watcher = watch('./myDropboxFolder');

watcher.on('change', function (path) {
  var file = path.replace('myDropboxFolder/', '');
  if (fs.existsSync(path)) {
    // enviar
  } else {
    // excluir
  }
});