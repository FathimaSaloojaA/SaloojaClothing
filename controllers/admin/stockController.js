const Product = require('../../models/productModel');

const getAllProductsForStockManagement = async (req, res) => {
  try {
    const { search, stockFilter, sort } = req.query;

    let filter = {};
    let sortOptions = { createdAt: -1 }; 

    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    
    if (stockFilter === 'low') {
      filter.stock = { $lt: 5 };
    } else if (stockFilter === 'out') {
      filter.stock = 0;
    }

    
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    else if (sort === 'stockLow') sortOptions = { stock: 1 };
    else if (sort === 'stockHigh') sortOptions = { stock: -1 };

    
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.render('admin/stockManagement', {
      layout: 'admin/adminLayout',
      products,
      query: req.query,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading inventory:", error);
    res.status(500).send("Server Error");
  }
};


const updateProductStock = async (req, res) => {
  const { stock } = req.body;
  const { productId } = req.params;

  try {
    await Product.findByIdAndUpdate(productId, { stock });
    res.redirect('/admin/inventory');
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).send("Server Error");
  }
};




module.exports={getAllProductsForStockManagement,updateProductStock}