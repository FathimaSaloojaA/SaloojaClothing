// controllers/cartController.js
const Cart = require('../../models/cartModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');


const viewCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('cart.productId');

    res.render('user/cart', { cartItems: user.cart,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading cart');
  }
};


const addToCart = async (req, res) => {
  const userId = req.session.user._id;
  const { productId, quantity } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product || product.isDeleted || product.stock === 0) {
      return res.redirect(`/product/${productId}?error=This product is unavailable or deleted.`);
    }

    const user = await User.findById(userId);

    const existingItem = user.cart.find(item => item.productId.equals(productId));

    if (existingItem) {
      const newQuantity = existingItem.quantity + parseInt(quantity);

      if (newQuantity > product.stock) {
        return res.redirect(`/product/${productId}?error=Requested quantity exceeds stock.`);
      }

      existingItem.quantity = newQuantity;
    } else {
      if (quantity > product.stock) {
        return res.redirect(`/product/${productId}?error=Requested quantity exceeds stock.`);
      }

      user.cart.push({
        productId,
        quantity
      });
    }

    // TODO: Remove from wishlist if you implement it
    // user.wishlist = user.wishlist.filter(item => item.toString() !== productId);

    await user.save();

    return res.redirect(`/product/${productId}?success=Product added to cart.`); // or show a SweetAlert via query or session
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};


// updateQuantity
const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;
    const { quantity } = req.body;

    const qty = parseInt(quantity);
    if (qty < 1) return res.status(400).json({ message: 'Invalid quantity' });

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({ message: 'Product not found or deleted' });
    }

    if (qty > product.stock) {
      return res.status(400).json({ message: 'Quantity exceeds stock' });
    }

    const user = await User.findById(userId);
    const cartItem = user.cart.find(item => 
  item.productId && item.productId.toString() === productId
);
    if (!cartItem) {
      return res.status(404).json({ message: 'Product not in cart' });
    }

    cartItem.quantity = qty;
    await user.save();

    res.json({ message: 'Quantity updated', quantity: qty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// removeFromCart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    const user = await User.findById(userId);
    user.cart = user.cart.filter(item => item.productId && item.productId.toString() !== productId);


    await user.save();

    res.json({ message: 'Product removed from cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};






module.exports = {
  addToCart,viewCart,updateQuantity,removeFromCart
};
