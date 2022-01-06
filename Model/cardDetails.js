const mongoose = require('mongoose');

const { Schema } = mongoose;

const cardDetailsModel = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  cardNum : String,
  cvv: String,
  expiryMon: String,
  expiryYr: String,
  zipCode: String,
});

module.exports = mongoose.model('Card', cardDetailsModel);