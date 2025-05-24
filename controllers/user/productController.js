const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');

exports.loadShopPage = async (req, res) => {
  try {
    const { category, subcategory,search,price } = req.query;

    const filter = { isListed: true, isDeleted: false };

    // Filter based on category and/or subcategory
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    //price filtering logic
if (price && price.length > 0) {
  const priceFilters = Array.isArray(price) ? price : [price];
  filter.variants = {
    $elemMatch: {
      $or: priceFilters.map(range => {
        const [min, max] = range.split('-').map(Number);
        return { price: { $gte: min, $lte: max } };
      })
    }
  };
}
    //sorting...
let sort = req.query.sort || []; 
if (!Array.isArray(sort)) {
      sort = [sort];
    }

const sortOption = {};
    sort.slice().reverse().forEach((val) => {
      if (val === 'priceAsc') sortOption['variants.price'] = 1;
      else if (val === 'priceDesc') sortOption['variants.price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });
//////////////////
if (search) {
  const searchWords = search.trim().split(/\s+/);

  const catMatch = await Category.find({
    name: { $in: searchWords.map(w => new RegExp(w, 'i')) },
    isListed: true,
    isDeleted: false
  }).select('_id');

  const subcatMatch = await Subcategory.find({
    name: { $in: searchWords.map(w => new RegExp(w, 'i')) },
    isListed: true,
    isDeleted: false
  }).select('_id');

  const categoryIds = catMatch.map(c => c._id);
  const subcategoryIds = subcatMatch.map(sc => sc._id);

  // Build filters per word
  const orFilters = searchWords.map(word => {
    const regex = new RegExp(word, 'i');

    const categoryFilter = category ? [] : [{ category: { $in: categoryIds } }];
    const subcategoryFilter = subcategory ? [] : [{ subcategory: { $in: subcategoryIds } }];

    return {
      $or: [
        { name: regex },
        { description: regex },
        { 'variants.color': regex },
        { highlights: regex },
        { couponNote: regex },
        ...categoryFilter,
        ...subcategoryFilter
      ]
    };
  });

  filter.$and = orFilters;
}


    
// Fetch products with filtering
    const products = await Product.find(filter)
      .populate('category')
      .populate('subcategory')
      .sort(sortOption)
      .lean();

    // Fetch all categories and subcategories
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    // Group subcategories under each category
    const categoryMap = categories.map(cat => {
      return {
        ...cat,
        subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString())
      };
    });

    // Render the page
    res.render('user/product', {
      userName: req.session.user ? req.session.user.name : '',
      products,
      search,
      sort,
      price,
      category: req.query.category,
  subcategory: req.query.subcategory,
      categories: categoryMap,
      layout: 'user/normalLayout'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


exports.loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
     const { category, subcategory,price } = req.query;

    const filter = { isListed: true, isDeleted: false };

    // Filter based on category and/or subcategory
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    // Group subcategories under each category
    const categoryMap = categories.map(cat => {
      return {
        ...cat,
        subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString())
      };
    });

const products = await Product.find(filter)
      .populate('category')
      .populate('subcategory')
      .lean();

    const product = await Product.findOne({
      _id: productId,
      isListed: true,
      isDeleted: false
    })
      .populate('category')
      .populate('subcategory')
      .lean();

    if (!product || product.isBlocked || product.isDeleted) {
      return res.redirect('/product'); // fallback if blocked or missing
    }

const relatedProducts = await Product.find({
  _id: { $ne: productId },
  category: product.category,
  isBlocked: false,
  isDeleted: false
}).limit(4).lean(); // use lean for easier data manipulation

// Extract first image from first variant
relatedProducts.forEach(prod => {
  const firstVariantWithImage = prod.variants.find(v => v.images?.length);
  prod.previewImage = firstVariantWithImage?.images[0] || "default.jpg";
  prod.price = firstVariantWithImage?.price || "N/A";
});


 const allVariantsOutOfStock = product.variants.every(variant => variant.stock === 0);
    if (allVariantsOutOfStock) {
      return res.redirect('/product'); // treat as unavailable
    }
    res.render('user/productDetails', {
      product,
      products,
      price,
      category: req.query.category,
  subcategory: req.query.subcategory,
  
      relatedProducts,
      userName: req.session.user ? req.session.user.name : '',
      layout: 'user/normalLayout',
      categories: categoryMap,
      
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

