const Offer = require('../models/offerModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const applyBestOfferToProduct = async (productId) => {
  try {
    const product = await Product.findById(productId).populate('category');
    if (!product) return;

    const now = new Date(Date.now() + (5.5 * 60 * 60 * 1000)); // Add 5.5 hours


    // Fetch product-level offers
    const productOffers = await Offer.find({
      product: productId,
      type: 'product',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    // Fetch category-level offers
    const categoryOffers = await Offer.find({
      category: product.category._id,
      type: 'category',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    const allOffers = [...productOffers, ...categoryOffers];

    let maxDiscount = 0;

    for (const offer of allOffers) {
      if (offer.discountPercentage > maxDiscount) {
        maxDiscount = offer.discountPercentage;
      }
    }

    // Update the product’s discount field
    product.discountPercentage = maxDiscount;
    await product.save();

  } catch (error) {
    console.error('Error applying best offer:', error);
  }
};
module.exports = applyBestOfferToProduct;
