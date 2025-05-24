// models/cartModel.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true } // in case price changes later
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [cartItemSchema]
});

module.exports = mongoose.model('Cart', cartSchema);
