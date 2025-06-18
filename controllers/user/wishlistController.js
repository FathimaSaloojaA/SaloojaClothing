// controllers/user/wishlistController.js
const User = require('../../models/userModel');
const Product = require('../../models/productModel');

/*const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.stock === 0) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }

    const user = await User.findById(userId);

    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      user.wishlist.push(productId);
      await user.save();
      return res.status(200).json({ success: true, added: true,count: user.wishlist.length });
    } else {
      user.wishlist.splice(index, 1);
      await user.save();
      return res.status(200).json({ success: true, added: false});
    }
  } catch (error) {
    console.error('Toggle Wishlist Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};*/


const toggleWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.stock === 0) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }

    const user = await User.findById(userId);
    const index = user.wishlist.indexOf(productId);

    let updatedUser;

    if (index === -1) {
      // Add to wishlist
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { wishlist: productId } },
        { new: true }
      );
      return res.status(200).json({ success: true, added: true, count: updatedUser.wishlist.length });
    } else {
      // Remove from wishlist
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { wishlist: productId } },
        { new: true }
      );
      return res.status(200).json({ success: true, added: false, count: updatedUser.wishlist.length });
    }

  } catch (error) {
    console.error('Toggle Wishlist Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const viewWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId).populate({
      path: 'wishlist',
      match: { isDeleted: false, isListed: true, isBlocked: false },
    });

    const wishlistItems = user.wishlist || [];
    
    let wishlistProductIds = [];
    
    if (req.session.user) {
      const user = await User.findById(req.session.user._id).lean();
      wishlistProductIds = user?.wishlist?.map(id => id.toString()) || [];
    }

    res.render('user/wishlist', {
      userName: req.session.user.firstName,
      products: wishlistItems,
      layout: 'user/detailsLayout',wishlistProductIds
    });
  } catch (error) {
    console.error('View Wishlist Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports={toggleWishlist,viewWishlist}