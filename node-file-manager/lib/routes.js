var fs = require('co-fs');
var path = require('path');
var views = require('co-views');
var origFs = require('fs');
var koaRouter = require('koa-router');
var bodyParser = require('koa-bodyparser');
var formParser = require('co-busboy');
var request = require('request');
var toArray = require('stream-to-array');

var Tools = require('./tools');
var FilePath = require('./fileMap').filePath;
var FileManager = require('./fileManager');

var api = 'http://localhost:3000/api/'

var router = new koaRouter();
var render = views(path.join(__dirname, './views'), { map: { html: 'ejs' } });

router.get('/', function* () {
  this.redirect('files');
});

router.get('/files', function* () {
  this.body = yield render('files');
});

router.get('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, function* () {
  var p = this.request.fPath;
  var stats = yield fs.stat(p);
  if (stats.isDirectory()) {
    this.body = yield* FileManager.list(p);
  }
  else {
    //this.body = yield fs.createReadStream(p);
    this.body = origFs.createReadStream(p);
  }
});

router.del('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, function* () {
  var p = this.request.fPath;
  yield* FileManager.remove(p);

  request.post({ url: api + 'removeLynk', form: { path: p.split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });

  this.body = 'Delete Succeed!';
});

router.put('/api/(.*)', Tools.loadRealPath, Tools.checkPathExists, bodyParser(), function* () {
  var type = this.query.type;
  var p = this.request.fPath;
  if (!type) {
    this.status = 400;
    this.body = 'Lack Arg Type'
  }
  else if (type === 'MOVE') {
    var src = this.request.body.src;
    if (!src || !(src instanceof Array)) return this.status = 400;
    var src = src.map(function (relPath) {
      return FilePath(relPath);
    });
    yield* FileManager.move(src, p);

    for (var i = 0; i < src.length; i++) {
      var newPath = '';
      if (p.split('myDropboxFolder/').length > 1) {
        newPath = p.split('myDropboxFolder/')[1];
        newPath += '/' + path.basename(src[i]);
      } else {
        newPath += path.basename(src[i]);
      }

      request.post({ url: api + 'removeLynk', form: { path: src[i].split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });
      request.post({ url: api + 'createLynk', form: { path: newPath } }, function (err, httpResponse, body) { });
    }

    this.body = 'Move Succeed!';
  }
  else if (type === 'RENAME') {
    var target = this.request.body.target;
    if (!target) return this.status = 400;
    yield* FileManager.rename(p, FilePath(target));

    request.post({ url: api + 'removeLynk', form: { path: p.split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });
    request.post({ url: api + 'createLynk', form: { path: FilePath(target).split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });

    this.body = 'Rename Succeed!';
  }
  else if (type === 'ARCHIVE') {
    var src = this.request.body.src;
    var archive = (p === '.' ? '' : p) + this.request.body.archive;
    if (!src) return this.status = 400;
    yield* FileManager.archive(C.data.root, archive, src, !!this.request.body.dirs);

    request.post({ url: api + 'createLynk', form: { path: archive.split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });

    this.body = 'Create Archive Succeed!';
  }
  else {
    this.status = 400;
    this.body = 'Arg Type Error!';
  }
});

router.post('/api/(.*)', Tools.loadRealPath, Tools.checkPathNotExists, function* () {
  var type = this.query.type;
  var p = this.request.fPath;
  if (!type) {
    this.status = 400;
    this.body = 'Lack Arg Type!';
  }
  else if (type === 'CREATE_FOLDER') {
    yield* FileManager.mkdirs(p);

    request.post({ url: api + 'createLynk', form: { path: p.split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });

    this.body = 'Create Folder Succeed!';
  }
  else if (type === 'UPLOAD_FILE') {
    var instance = this;
    var formData = yield formParser(this.req);
    if (formData.fieldname === 'upload') {
      toArray(formData).then(function (parts) {
        var buffers = [];

        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          buffers.push((part instanceof Buffer) ? part : Buffer.from(part));
        }

        return Buffer.concat(buffers);
      }).then(function (buffer) {
        origFs.writeFileSync(p, buffer);
        // var writeStream = origFs.createWriteStream(p);
        // formData.pipe(writeStream);

        request.post({ url: api + 'createLynk', form: { path: p.split('myDropboxFolder/')[1] } }, function (err, httpResponse, body) { });

      });
      instance.body = 'Upload File Succeed!';
    }
    else {
      this.status = 400;
      this.body = 'Lack Upload File!';
    }
  }
  else {
    this.status = 400;
    this.body = 'Arg Type Error!';
  }
});

module.exports = router.middleware();
