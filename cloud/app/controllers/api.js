var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var os = require('os');
var path = require('path');

var express = require('express'),
  router = express.Router();

var Item = require('../models/Item');

var prefix = __dirname + '/../../public/myDropboxFolder/';

var hostname = os.userInfo().username + '@' + os.hostname();

module.exports = function (app) {
  app.use('/api', router);
};

// Remove arquivo do BD
router.post('/removeLynk', function (req, res, next) {
  Item.findByIdAndRemove(req.body.path, function (err, file) {
    if (err) {
      next(err);
    } else {
      res.send(true);
    }
  });
});

// Adiciona arquivo no BD
router.post('/createLynk', function (req, res, next) {
  var file = {
    _id: req.body.path,
    hostname: hostname
  }

  Item.update({ _id: req.body.path }, file, { upsert: true }, function (err, file) {
    if (err) {
      next(err);
    } else {
      res.send(true);
    }
  });
});

// Recebe uma pasta do computador e salva ela
router.post('/sendFolder', function (req, res, next) {
  var folder = {
    _id: req.body.path,
    hostname: req.body.hostname
  };

  Item.update({ _id: req.body.path }, folder, { upsert: true }, function (err, folder) {
    if (err) {
      next(err);
    } else {
      mkdirp.sync(prefix + req.body.path);
      res.send(true);
    }
  });
})

// Recebe um arquivo do computador e salva ele
router.post('/sendFile', function (req, res, next) {
  var file = {
    _id: req.body.path,
    hostname: req.body.hostname
  };

  Item.update({ _id: req.body.path }, file, { upsert: true }, function (err, file) {
    if (err) {
      next(err);
    } else {
      fs.writeFileSync(prefix + req.body.path, req.files.newFile.data);
      res.send(true);
    }
  });
});

// Recebe o nome de um arquivo que deve ser removido
router.post('/removeFile', function (req, res, next) {
  if (fs.existsSync(prefix + req.body.path)) {
    Item.findByIdAndRemove(req.body.path, function (err, file) {
      if (err) {
        next(err);
      } else {
        rimraf.sync(prefix + req.body.path);
        res.send(true);
      }
    });
  } else {
    res.send(true);
  }
});

// Envia o arquivo requisitado
router.post('/getFile', function (req, res, next) {
  var file = fs.readFileSync(prefix + req.body.path);

  console.log(file.byteLength);

  res.send(file);
});

// Envia a lista de arquivos e subpastas
router.get('/getStatus', function (req, res, next) {
  walkFiles('').then(function (fileList) {
    res.send(fileList);
  }).catch(function (err) {
    next(err);
  });
});

function walkFiles(dir) {
  var files = fs.readdirSync(prefix + dir);

  return Promise.all(
    files.map(function (file) {
      var stats = fs.statSync(prefix + dir + file);

      return Item.find({ _id: dir + file }, 'hostname').exec().then(function (item) {
        if (stats.isDirectory()) {
          return walkFiles(dir + file + '/').then(function (list) {
            return { name: file, hostname: item[0].hostname, files: list };
          });
        } else {
          return { name: file, hostname: item[0].hostname };
        }
      });
    })
  ).then(function (list) {
    return list;
  });
}
