const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    expires: 300, // 5 minutes TTL
    default: Date.now
  }
});

module.exports = mongoose.model('Otp', otpSchema);
