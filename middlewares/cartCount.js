const User = require('../models/userModel');
const setCartCount = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      const user = await User.findById(req.session.user._id).lean();
      // Calculate the total quantity of items in the cart
      res.locals.cartCount = user?.cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;
    } else {
      res.locals.cartCount = 0;
    }
  } catch (err) {
    console.error('Error in cartCount middleware:', err);
    res.locals.cartCount = 0;
  }
  next();
};

module.exports = setCartCount;