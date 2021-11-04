const mongoose = require('mongoose');

const { Schema } = mongoose;

const ipModel = new Schema({
  name: String,
  ip: String,
});

module.exports = mongoose.model('IP', ipModel);