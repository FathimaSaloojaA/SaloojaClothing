const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
  orderID: { type: String, required: true, unique: true }, // user-friendly unique ID
  userEmail: { type: String, required: true }, // link order to user by email
  products: [
    {
      productId: { type: Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      quantity: Number,
      price: Number,
      status: { type: String, default: 'ordered' }, // e.g. ordered, shipped, cancelled
    },
  ],
  totalPrice: Number,
  status: { type: String, default: 'pending' }, // overall order status
  orderDate: { type: Date, default: Date.now },
  // Add other fields like shipping address, payment info, etc.
});

module.exports = mongoose.model('Order', orderSchema);
