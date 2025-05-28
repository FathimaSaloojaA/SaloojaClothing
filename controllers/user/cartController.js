// controllers/cartController.js
const Cart = require('../../models/cartModel');
const Product = require('../../models/productModel');

const addToCart = async (req, res) => {
  const userId = req.session.userId;
  const { productId, variantId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.isBlocked || product.isDeleted) {
    return res.redirect('/product')
  }

  const variant = product.variants.id(variantId);
  if (!variant || variant.stock < quantity) {
    return res.status(400).json({ outOfStock: true });
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const existingItem = cart.items.find(
    item => item.productId.equals(productId) && item.variantId.equals(variantId)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      variantId,
      quantity,
      price: variant.price
    });
  }

  await cart.save();
  res.status(200).json({ success: true });
};

module.exports = {
  addToCart
};
