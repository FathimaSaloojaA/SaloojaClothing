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
      returnReason: { type: String, default: '' },
      status: { type: String, default: 'ordered' },//e.g. ordered, shipped, cancelled
      refunded: { type: Boolean, default: false } 
    },
  ],
  totalPrice: Number,
  status: { type: String, default: 'pending' }, 
  cancelReason: { type: String, default: '' },
  returnReason: { type: String, default: '' },
// overall order status
  orderDate: { type: Date, default: Date.now },
  shippingAddress: {
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String
},
paymentMethod: { type: String },
razorpayPaymentId: {
  type: String,
  default: null
},
couponCode: { type: String, default: null },
couponDiscount: { type: Number, default: 0 },

 // For future methods

});

module.exports = mongoose.model('Order', orderSchema);
