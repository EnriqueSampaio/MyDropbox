var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var express = require('express'),
  router = express.Router();

module.exports = function (app) {
  app.use('/api', router);
};

// Recebe uma pasta do computador e salva ela
router.post('/sendFolder', function (req, res, next) {
  mkdirp.sync(__dirname + '/../../public/myDropboxFolder/' + req.body.path);

  res.send(true);
})

// Recebe um arquivo do computador e salva ele
router.post('/sendFile', function (req, res, next) {
  fs.writeFileSync(__dirname + '/../../public/myDropboxFolder/' + req.body.path, req.files.newFile.data);

  res.send(true);
});

// Recebe o nome de um arquivo que deve ser removido
router.post('/removeFile', function (req, res, next) {
  if (fs.existsSync(__dirname + '/../../public/myDropboxFolder/' + req.body.path)) {
    rimraf.sync(__dirname + '/../../public/myDropboxFolder/' + req.body.path);
  }

  res.send(true);
})

// Envia o arquivo requisitado
router.post('/getFile', function (req, res, next) {
  res.send(fs.createReadStream(__dirname + '/../../public/myDropboxFolder/' + req.body.filePath));
});

// Envia a lista de arquivos e subpastas
router.get('/getStatus', function (req, res, next) {
  var fileList = walkFiles(__dirname + '/../../public/myDropboxFolder');

  res.send(fileList);
});

function walkFiles(dir) {
  var files = fs.readdirSync(dir);

  var fl = [];

  files.forEach(function (file) {
    var stats = fs.statSync(dir + '/' + file);
    if (stats.isDirectory()) {
      fl.push({
        name: file,
        mtime: stats.mtime,
        files: walkFiles(dir + '/' + file)
      });
    } else {
      fl.push({
        name: file,
        mtime: stats.mtime
      });
    }
  });

  return fl;
}
