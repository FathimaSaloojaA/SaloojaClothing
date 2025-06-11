// controllers/cartController.js
const Cart = require('../../models/cartModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');


const viewCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('cart.productId');

    const cartItems = user.cart.map(item => {
      const product = item.productId;
      const isUnavailable = !product || product.isDeleted || product.stock === 0;

      return {
        ...item.toObject(),
        product,
        isUnavailable
      };
    });

    const hasInvalidItems = cartItems.some(item => item.isUnavailable);

    res.render('user/cart', {
      cartItems,
      hasInvalidItems,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout'
    });
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
      const message = 'This product is unavailable or deleted.';
      return req.xhr || req.headers.accept.includes('json')
        ? res.status(400).json({ success: false, message })
        : res.redirect(`/product/${productId}?error=${message}`);
    }

    const user = await User.findById(userId);
    const existingItem = user.cart.find(item => item.productId.equals(productId));
    const requestedQty = parseInt(quantity);

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQty;

      if (newQuantity > product.stock) {
        const message = `Only ${product.stock} items left in stock.`;
        return req.xhr || req.headers.accept.includes('json')
          ? res.status(400).json({ success: false, message })
          : res.redirect(`/product/${productId}?error=${message}`);
      }

      existingItem.quantity = newQuantity;
    } else {
      if (requestedQty > product.stock) {
        const message = `Only ${product.stock} items available in stock.`;
        return req.xhr || req.headers.accept.includes('json')
          ? res.status(400).json({ success: false, message })
          : res.redirect(`/product/${productId}?error=${message}`);
      }

      user.cart.push({ productId, quantity: requestedQty });
    }

    await user.save();

    const cartCount = user.cart.length;

    return req.xhr || req.headers.accept.includes('json')
      ? res.status(200).json({ success: true, message: 'Product added to cart.', cartCount })
      : res.redirect(`/product/${productId}?success=Product added to cart.`);
  } catch (err) {
    console.error('AddToCart Error:', err);
    return req.xhr || req.headers.accept.includes('json')
      ? res.status(500).json({ success: false, message: 'Something went wrong on the server.' })
      : res.status(500).send('Internal Server Error');
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

const cartCount=async (req, res) => {
  try {
    if (!req.session.user) return res.json({ cartCount: 0 });

    const user = await User.findById(req.session.user._id).lean();
    const count = user.cart.reduce((acc, item) => acc + item.quantity, 0);
    res.json({ cartCount: count });
  } catch (err) {
    console.error('Cart count error:', err);
    res.status(500).json({ cartCount: 0 });
  }
};





module.exports = {
  addToCart,viewCart,updateQuantity,removeFromCart,cartCount
};
