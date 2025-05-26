
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');


const loadHome = async (req, res) => {
  try {

 const { category, subcategory,search,price } = req.query;
 
     const filter = { isListed: true, isDeleted: false ,isBlocked:false};
 
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
     res.render('user/home', {
       userName: req.session.user ? req.session.user.firstName : '',
       products,
       search,
       sort,
       title:'Home',
       price,
       category: req.query.category,
   subcategory: req.query.subcategory,
       categories: categoryMap,
       layout: 'user/indexLayout'
     });
   }



    
  catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  loadHome,
  // ... export other methods too
};
