// models/Wallet.js
const mongoose = require('mongoose');

const walletModel = new mongoose.Schema({
  userEmail: { type: String, required: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: Number,
    description: String,
    date: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Wallet', walletModel);
