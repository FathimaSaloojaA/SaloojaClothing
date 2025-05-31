const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');

exports.loadShopPage = async (req, res) => {
  try {
    const { category, subcategory, search, price } = req.query;

    const filter = { isListed: true, isDeleted: false, isBlocked: false };

    // Filter by category/subcategory
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    // Price filtering logic
    if (price && price.length > 0) {
      const priceFilters = Array.isArray(price) ? price : [price];
      filter.variants = {
        $elemMatch: {
          isDeleted: false,
          $or: priceFilters.map(range => {
            const [min, max] = range.split('-').map(Number);
            return { price: { $gte: min, $lte: max } };
          })
        }
      };
    }

    // Sorting
    let sort = req.query.sort || [];
    if (!Array.isArray(sort)) sort = [sort];

    const sortOption = {};
    sort.slice().reverse().forEach(val => {
      if (val === 'priceAsc') sortOption['variants.price'] = 1;
      else if (val === 'priceDesc') sortOption['variants.price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });

    // Search Logic
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

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Fetch all matching products (initially all)
    const allMatchingProducts = await Product.find(filter)
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

    // Filter out products without valid category or subcategory
    const trulyFiltered = allMatchingProducts.filter(prod => prod.category && prod.subcategory);

    const totalProducts = trulyFiltered.length;
    const totalPages = Math.ceil(totalProducts / limit);

    // Slice paginated products
    const paginatedProducts = trulyFiltered.slice(skip, skip + limit);

    // Fetch categories and subcategories for filter display
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    const categoryMap = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString())
    }));
console.log('Is authenticated?', req.isAuthenticated());
  console.log('User:', req.user);
  
    res.render('user/product', {
      userName: req.session.user ? req.session.user.firstName : '',
      products: paginatedProducts,
      search,
      sort,
      price,
      category: req.query.category,
      subcategory: req.query.subcategory,
      categories: categoryMap,
      currentPage: page,
      totalPages,
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
    const { category, subcategory, price ,search} = req.query;

    const filter = { isListed: true, isDeleted: false };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    // Fetch valid categories and subcategories
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const subcategories = await Subcategory.find({ isListed: true, isDeleted: false }).lean();

    // Group subcategories under each category
    const categoryMap = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category.toString() === cat._id.toString())
    }));

    // Fetch products and filter out any with deleted/unlisted category or subcategory
    const productsRaw = await Product.find(filter)
      .populate({
        path: 'category',
        match: { isListed: true, isDeleted: false }
      })
      .populate({
        path: 'subcategory',
        match: { isListed: true, isDeleted: false }
      })
      .lean();

    const products = productsRaw.filter(p => p.category && p.subcategory);

    // Fetch main product
    const product = await Product.findOne({
      _id: productId,
      isListed: true,
      isDeleted: false
    })
      .populate({
        path: 'category',
        match: { isListed: true, isDeleted: false }
      })
      .populate({
        path: 'subcategory',
        match: { isListed: true, isDeleted: false }
      })
      .lean();

    if (!product || product.isBlocked || !product.category || !product.subcategory) {
      return res.redirect('/product'); // Invalid or hidden product
    }

    // Check stock
    const allVariantsOutOfStock = product.variants.every(v => v.stock === 0);
    if (allVariantsOutOfStock) {
      return res.redirect('/product'); // Treat as unavailable
    }

    // Related products from same (still valid) category
    const relatedRaw = await Product.find({
      _id: { $ne: productId },
      category: product.category._id,
      isBlocked: false,
      isDeleted: false
    })
      .populate({
        path: 'category',
        match: { isListed: true, isDeleted: false }
      })
      .populate({
        path: 'subcategory',
        match: { isListed: true, isDeleted: false }
      })
      .limit(4)
      .lean();

    const relatedProducts = relatedRaw
      .filter(p => p.category && p.subcategory)
      .map(prod => {
        const variantWithImage = prod.variants.find(v => v.images?.length);
        return {
          ...prod,
          previewImage: variantWithImage?.images[0] || "default.jpg",
          price: variantWithImage?.price || "N/A"
        };
      });

    // Sort handling
    let sort = req.query.sort || [];
    if (!Array.isArray(sort)) sort = [sort];

    const sortOption = {};
    sort.slice().reverse().forEach(val => {
      if (val === 'priceAsc') sortOption['variants.price'] = 1;
      else if (val === 'priceDesc') sortOption['variants.price'] = -1;
      else if (val === 'nameAsc') sortOption['name'] = 1;
      else if (val === 'nameDesc') sortOption['name'] = -1;
    });
    // Search Logic
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


    // Render product details
    res.render('user/productDetails', {
      product,
      products,
      price,
      sort,
      search,
      category,
      subcategory,
      relatedProducts,
      userName: req.session.user ? req.session.user.name : '',
      layout: 'user/normalLayout',
      categories: categoryMap
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};
