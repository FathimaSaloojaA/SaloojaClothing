const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isListed: { type: Boolean, default: true },
});

module.exports = mongoose.model('SubCategory', subCategorySchema);
