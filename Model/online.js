const mongoose = require('mongoose');

const { Schema } = mongoose;

const onlineModel = new Schema({
  online: Boolean,
  name: String,
});

module.exports = mongoose.model('online', onlineModel);
