var mongoose = require('../../app').getDBInstance();

var itemSchema = mongoose.Schema({
  hostname: String,
  _id: String,
  size: Number
});

itemSchema.virtual('filePath').get(function() {
    return this._id;
});

var Item = mongoose.model('Item', itemSchema);

module.exports = Item;
