var fs = require('fs');

var express = require('express'),
  router = express.Router();

module.exports = function (app) {
  app.use('/upload', router);
};

router.post('/', function (req, res, next) {
  try {
    fs.writeFileSync(__dirname + '/../../public/myDropboxFolder/' + req.files.newFile.name, req.files.newFile.data);
    res.send(true);
  } catch (error) {
    res.send(false);
  }
});
