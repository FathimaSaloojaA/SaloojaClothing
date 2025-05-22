const Product = require('../../models/productModel');

module.exports={
loadShopPage : async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false }); // or your own logic
    res.render('user/product', {
      userName: req.session.user.name || '',
      products,
      layout:'user/normalLayout'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}

}
