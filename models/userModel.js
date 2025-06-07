const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetToken: { type: String },
  resetTokenExpire: { type: Date },
  emailVerifyToken: { type: String },
emailTemp: { type: String },

  isAdmin: {
    type: Boolean,
    default: false
  },

  // ✅ NEWLY ADDED FIELDS
  profileImage: {
    type: String, // Store image URL or filename
    default: ''
  },
  addresses: [addressSchema]
});

module.exports = mongoose.model('User', userSchema);
