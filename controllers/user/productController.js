const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');
const User = require('../../models/userModel');
const applyBestOfferToProduct = require('../../utils/applyBestOfferToProduct');



exports.loadShopPage = async (req, res) => {
  try {
    let { category, subcategory, search, price, sort } = req.query;

    // Normalize price to array for safe EJS iteration
    if (price && !Array.isArray(price)) {
      price = [price];
    }

    // Normalize sort to array for safe EJS iteration
    if (sort && !Array.isArray(sort)) {
      sort = [sort];
    } else if (!sort) {
      sort = [];
    }

    const filter = { isListed: true, isDeleted: false, isBlocked: false };

    // Filter by category/subcategory
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    // Price filtering logic
    if (price && price.length > 0) {
      const priceFilters = price;
      filter.$or = priceFilters.map(range => {
  const [min, max] = range.split('-').map(Number);
  return { price: { $gte: min, $lte: max } };
});

      
    }

    // Sorting
    const sortOption = {};
    sort.slice().reverse().forEach(val => {
      if (val === 'priceAsc') sortOption['price'] = 1;
      else if (val === 'priceDesc') sortOption['price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });

    // Search Logic (unchanged)
    if (search) {
      const searchWords = search.trim().split(/\s+/);

      const catMatch = await Category.find({
        name: { $in: searchWords.map(w => new RegExp(w, 'i')) },
        isListed: true,
        isDeleted: false,
      }).select('_id');

      const subcatMatch = await Subcategory.find({
        name: { $in: searchWords.map(w => new RegExp(w, 'i')) },
        isListed: true,
        isDeleted: false,
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
            ...subcategoryFilter,
          ],
        };
      });

      filter.$and = orFilters;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Fetch products
    const allMatchingProducts = await Product.find(filter)
      .populate({
        path: 'category',
        match: { isListed: true, isDeleted: false },
      })
      .populate({
        path: 'subcategory',
        match: { isListed: true, isDeleted: false },
      })
      .sort(sortOption)
      .lean();

    // Filter out invalid
    const trulyFiltered = allMatchingProducts.filter(prod => prod.category && prod.subcategory);
    // Reapply valid offers to ensure expired ones are ignored
for (let product of trulyFiltered) {
  await applyBestOfferToProduct(product._id);
}


    const totalProducts = trulyFiltered.length;
    const totalPages = Math.ceil(totalProducts / limit);

    // Paginate
    const paginatedProducts = trulyFiltered.slice(skip, skip + limit);

    // Fetch categories & subcategories for filter UI
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    const categoryMap = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString()&& sub.isDeleted === false),
    }));
    

let wishlistProductIds = [];

if (req.session.user) {
  const user = await User.findById(req.session.user._id).lean();
  wishlistProductIds = user?.wishlist?.map(id => id.toString()) || [];
}
    res.render('user/product', {
      userName: req.session.user ? req.session.user.firstName : '',
      products: paginatedProducts,
      search,
      sort,
      wishlistProductIds,
      price,
      category,
      subcategory,
      categories: categoryMap,
      currentPage: page,
      totalPages,
      layout: 'user/normalLayout',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


exports.loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const { category, subcategory, price, search } = req.query;

    const filter = { isListed: true, isDeleted: false };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    const categoryMap = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString())
    }));

    const productsRaw = await Product.find(filter)
      .populate({ path: 'category', match: { isListed: true, isDeleted: false } })
      .populate({ path: 'subcategory', match: { isListed: true, isDeleted: false } })
      .lean();

    const products = productsRaw.filter(p => p.category && p.subcategory);

    // Fetch main product
    const product = await Product.findOne({
      _id: productId,
      isListed: true,
      isDeleted: false
    })
      .populate({ path: 'category', match: { isListed: true, isDeleted: false } })
      .populate({ path: 'subcategory', match: { isListed: true, isDeleted: false } })
      .lean();

      await applyBestOfferToProduct(product._id);


    if (!product || product.isBlocked || !product.category || !product.subcategory) {
      return res.redirect('/product');
    }

    

    // ✅ Corrected version: maintain original extension



    // Related products
    const relatedRaw = await Product.find({
      _id: { $ne: productId },
      category: product.category._id,
      isBlocked: false,
      isDeleted: false
    })
      .populate({ path: 'category', match: { isListed: true, isDeleted: false } })
      .populate({ path: 'subcategory', match: { isListed: true, isDeleted: false } })
      .limit(4)
      .lean();

    const relatedProducts = relatedRaw
  .filter(p => p.category && p.subcategory)
  .map(prod => {
    return {
      ...prod,
      previewImage: prod.images?.[0] || "default.jpg",
      price: prod.price || "N/A"
    };
  });


    // Sorting
    let sort = req.query.sort || [];
    if (!Array.isArray(sort)) sort = [sort];

    const sortOption = {};
    sort.slice().reverse().forEach(val => {
      if (val === 'priceAsc') sortOption['price'] = 1;
      else if (val === 'priceDesc') sortOption['price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });

    // Search
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

let wishlistProductIds = [];

if (req.session.user) {
  const user = await User.findById(req.session.user._id).lean();
  wishlistProductIds = user?.wishlist?.map(id => id.toString()) || [];
}


    res.render('user/productDetails', {
      product,
      wishlistProductIds,
      products,
      price,
      sort,
      search,
      category,
      subcategory,
      relatedProducts,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout',
      categories: categoryMap
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

