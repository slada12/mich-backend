const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserModel = new Schema({
  name: String,
  email: String,
  password: String,
  isClient: Boolean,
  isAllow: Boolean,
  investmentPlan: {
    plan: String,
    dateToEnd: Date,
    profit: Number,
  },
  accountBalance: {
    type: Number,
    default: 0
  },
  investmentBalance: {
    type: Number,
    default: 0,
  },
  walletAddress: String,
  phoneNumber: String,
  bitcoinAddress: String,
  address: {
    houseAddress: String,
    city: String,
    state: String,
  },
  isLinked: {
    type: Boolean,
    default: false,
  },
  transfer: [
    {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Transaction',
      },
      sender: Boolean,
    },
  ],
  pin: String,
  resetToken: String,
  ipAddress: String,
  accountLocked: {
    type: Boolean,
    default: false,
  }
});

module.exports = mongoose.model('User', UserModel);
