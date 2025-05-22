const Product = require('../../models/productModel');
require('../../models/categoryModel');


exports.loadShopPage = async (req, res) => {
  try {
    // Fetch only products that are listed and not deleted
    const products = await Product.find({ isListed: true, isDeleted: false ,})
       .populate('category') // optional: to get category details
      .lean();               // returns plain JS objects, easier for EJS

    res.render('user/product', {
      userName: req.session.user ? req.session.user.name : '',
      products,
      layout:'user/normalLayout'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

