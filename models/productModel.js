// models/productModel.js

const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: { type: String },       // e.g., 'S', 'M', 'L'
  color: { type: String },      // e.g., 'Red', 'Blue'
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  images: [String]              // Array of image URLs
});

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true },
  highlights:[String],
  variants: [variantSchema],   // Array of product variants
  totalStock: { type: Number, required: true },  // Optional if you want total separate
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  reviews: [reviewSchema],     // Embedded reviews
  isListed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  
  subcategory: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'SubCategory'
},
discountPercentage: {
  type: Number,
  default: 0,
},
couponNote: {
  type: String,
  default: null,
}

});






module.exports = mongoose.model('Product', productSchema);
