const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  isDefault: {
      type: Boolean,
      default: false
    }
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false
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
  addresses: [addressSchema],
  cart: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      }
    }
  ],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    

  referralCode: {
  type: String,
  unique: true,
  uppercase: true,
  sparse: true
},
  referredBy: {
    type: String,
    default: null
  },
  rewardCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],



});



module.exports = mongoose.model('User', userSchema);
