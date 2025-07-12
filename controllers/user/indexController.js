
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');


const loadHome = async (req, res) => {
  try {

    const showPreloader = req.session.showPreloader || false;

  
  req.session.showPreloader = false;

    const { category, subcategory, search, price } = req.query;

    const filter = { isListed: true, isDeleted: false, isBlocked: false };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    // price filtering logic
    if (price && price.length > 0) {
  const priceFilters = Array.isArray(price) ? price : [price];
  filter.$or = priceFilters.map(range => {
    const [min, max] = range.split('-').map(Number);
    return { price: { $gte: min, $lte: max } };
  });
}


    // sorting logic
    let sort = req.query.sort || [];
    if (!Array.isArray(sort)) {
      sort = [sort];
    }

    const sortOption = {};
    sort.slice().reverse().forEach((val) => {
      if (val === 'priceAsc') sortOption['price'] = 1;
      else if (val === 'priceDesc') sortOption['price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });

    // Search logic here (same as your original code)...

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

      const orFilters = searchWords.map(word => {
        const regex = new RegExp(word, 'i');

        const categoryFilter = category ? [] : [{ category: { $in: categoryIds } }];
        const subcategoryFilter = subcategory ? [] : [{ subcategory: { $in: subcategoryIds } }];

        return {
          $or: [
            { name: regex },
            { description: regex },
          
            { highlights: regex },
            { couponNote: regex },
            ...categoryFilter,
            ...subcategoryFilter
          ]
        };
      });

      filter.$and = orFilters;
    }

    
    let products = await Product.find(filter)
      .populate({
        path: 'category',
        match: { isListed: true, isDeleted: false }
      })
      .populate({
        path: 'subcategory',
        match: { isListed: true, isDeleted: false }
      })
      .sort(sortOption)
      .lean();

    
    products = products.filter(prod => prod.category && prod.subcategory);

   
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    
    const categoryMap = categories.map(cat => {
      return {
        ...cat,
        subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString()&& sub.isDeleted === false)
      };
    });

    
    const categoriesWithData = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({ category: category._id, isDeleted: false });

        const productCount = products.length;
let image = '';
if (products.length > 0 && products[0].images && products[0].images.length > 0) {
  image = products[0].images[0];  
}



        return {
          _id: category._id,
          name: category.name,
          productCount,
          image
        };
      })
    );

    const newArrivals = await Product.find({ isDeleted: false, isListed: true })
  .populate({
    path: 'category',
    match: { isListed: true, isDeleted: false }
  })
  .populate({
    path: 'subcategory',
    match: { isListed: true, isDeleted: false }
  })
  .sort({ createdAt: -1 })
  .limit(6)
  .lean();

const filteredNewArrivals = newArrivals.filter(prod => prod.category && prod.subcategory);

const newArrivalsWithImages = filteredNewArrivals.map(product => {
  const image = (product.images && product.images.length > 0)
    ? product.images[0]
    : 'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v.../default.jpg';

  
  return {
    _id: product._id,
    name: product.name,
    price: product.price,
    image
  };
});


    
    res.render('user/home', {
      userName: req.session.user ? req.session.user.firstName : '',
      products,
      search,
      sort,
      title: 'Home',
      newArrivals: newArrivalsWithImages,
      price,
      category: req.query.category,
      subcategory: req.query.subcategory,
      categories: categoryMap,
      categoriesWithData,
      layout: 'user/indexLayout',
      showPreloader
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  loadHome,
  
};
