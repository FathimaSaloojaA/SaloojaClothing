const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },  // Name of the offer
  type: { type: String, enum: ['product', 'category'], required: true },  // Either a product-level or category-level offer
  discountPercentage: { type: Number, required: true },  // % value like 10, 20
  startDate: { type: Date, required: true },  // When the offer becomes active
  endDate: { type: Date, required: true },    // When the offer expires
  isActive: { type: Boolean, default: true }, // Manually deactivate if needed

  // One of these will be filled depending on type
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
});

module.exports = mongoose.model('Offer', offerSchema);
