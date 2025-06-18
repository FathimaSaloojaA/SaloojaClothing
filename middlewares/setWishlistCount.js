const User = require('../models/userModel');
const setWishlistCount = async (req, res, next) => {
  try {
    if (req.session?.user?._id) {
      const user = await User.findById(req.session.user._id).select('wishlist');
      res.locals.wishlistCount = user?.wishlist?.length || 0;
    } else {
      res.locals.wishlistCount = 0;
    }
    next();
  } catch (err) {
    console.error('Wishlist Count Middleware Error:', err);
    res.locals.wishlistCount = 0;
    next();
  }
};

module.exports = setWishlistCount;