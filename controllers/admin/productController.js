const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');
const Product=require('../../models/productModel');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const loadProductList = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const filter = {
      
      name: { $regex: searchQuery, $options: 'i' },
    };

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .populate('category') // show category even if soft-deleted
      .populate('subcategory') // same for subcategory
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    

    res.render('admin/product', {
      products,
      searchQuery,
      currentPage: page,
      totalPages,
      layout: 'admin/adminLayout'
    });
  } catch (error) {
    console.error('Load Product List Error:', error);
    res.status(500).send('Internal Server Error');
  }
};


const loadAddProductPage = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false });
    //const subcategories = await Subcategory.find({ isDeleted: false });
    const subcategories = await Subcategory.find({ isDeleted: false }).populate('category', '_id');


    res.render('admin/addProduct', {
      categories,
      subcategories,
      layout: 'admin/adminLayout',
    });
  } catch (error) {
    console.error('Load Add Product Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      highlights,
      couponNote,
      discountPercentage,
      variantSizes,
      variantColors,
      variantPrices,
      variantStocks
    } = req.body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return renderWithError('Product name cannot be empty or just spaces.');
    }

    if (discountPercentage && parseFloat(discountPercentage) >= 100) {
      return renderWithError('Discount percentage must be less than 100.');
    }

    // Ensure these are arrays even if single values are submitted
    const variantSizesArr = Array.isArray(variantSizes) ? variantSizes : [variantSizes];
    const variantColorsArr = Array.isArray(variantColors) ? variantColors : [variantColors];
    const variantPricesArr = Array.isArray(variantPrices) ? variantPrices : [variantPrices];
    const variantStocksArr = Array.isArray(variantStocks) ? variantStocks : [variantStocks];

    // Validate stocks
    for (const stock of variantStocksArr) {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return renderWithError('Stock values must be valid non-negative numbers.');
      }
    }

    // Validate for duplicate variants
    const variantKeySet = new Set();
    for (let i = 0; i < variantSizesArr.length; i++) {
      const key = `${variantSizesArr[i].toLowerCase()}-${variantColorsArr[i].toLowerCase()}`;
      if (variantKeySet.has(key)) {
        return renderWithError(`Duplicate variant found: Size "${variantSizesArr[i]}", Color "${variantColorsArr[i]}"`);
      }
      variantKeySet.add(key);
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({
      name: trimmedName,
      category,
      subcategory
    });

    if (existingProduct) {
      return renderWithError('Product name already exists under this category and subcategory.');
    }

    // Process image uploads
    let images = [];
    for (const file of req.files) {
      const fileName = `product_${Date.now()}_${file.originalname}`;
      const outputPath = path.join(__dirname, '../../public/product-images', fileName);

      await sharp(file.buffer)
        .resize(600, 600)
        .toFile(outputPath);

      images.push(`/product-images/${fileName}`);
    }

    // Build variants
    const variants = [];
    for (let i = 0; i < variantSizesArr.length; i++) {
      variants.push({
        size: variantSizesArr[i],
        color: variantColorsArr[i],
        price: variantPricesArr[i],
        stock: variantStocksArr[i],
        images: [images[i]]
      });
    }

    const totalStock = variantStocksArr.reduce((sum, stock) => sum + parseInt(stock), 0);

    const product = new Product({
      name: trimmedName,
      description,
      category,
      subcategory,
      highlights: highlights ? highlights.split(',').map(h => h.trim()) : [],
      couponNote,
      discountPercentage,
      variants,
      totalStock,
    });

    await product.save();
    res.redirect('/admin/products');

    // Reusable error rendering function
    async function renderWithError(errorMessage) {
      return res.render('admin/addProduct', {
        error: errorMessage,
        categories: await Category.find({ isDeleted: false }),
        subcategories: await Subcategory.find({ category, isDeleted: false }),
        layout: 'admin/adminLayout'
      });
    }

  } catch (error) {
    console.error('Add Product Error:', error);
    res.status(500).send('Internal Server Error');
  }
};


const loadEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate('category subcategory');

    const categories = await Category.find({ isDeleted: false });

    // Get subcategories grouped by category
    const subcategories = await Subcategory.find({ isDeleted: false });

    // Group subcategories by category ID
    const subcategoriesByCategory = {};
    subcategories.forEach(subcat => {
      const catId = subcat.category.toString();
      if (!subcategoriesByCategory[catId]) {
        subcategoriesByCategory[catId] = [];
      }
      subcategoriesByCategory[catId].push(subcat);
    });

    res.render('admin/editProduct', {
      product,
      categories,
      subcategoriesByCategory,
      layout: 'admin/adminLayout',
    });
  } catch (error) {
    console.error('Load Edit Product Error:', error);
    res.status(500).send('Internal Server Error');
  }
};



const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      description,
      category,
      subcategory,
      highlights,
      couponNote,
      discountPercentage,
      existingVariantIds = [],
      existingVariantSizes = [],
      existingVariantColors = [],
      existingVariantPrices = [],
      existingVariantStocks = [],
      removedVariantIds = [],
      newVariantSizes = [],
      newVariantColors = [],
      newVariantPrices = [],
      newVariantStocks = []
    } = req.body;

    // === 1. Validate & Trim Basic Fields ===
    const trimmedName = name?.trim();
    const trimmedDesc = description?.trim();
    const trimmedHighlights = highlights?.trim();
    const trimmedCouponNote = couponNote?.trim();
    const discount = parseFloat(discountPercentage);

    if (!trimmedName || !trimmedDesc || !trimmedHighlights || !trimmedCouponNote) {
      return res.status(400).send('Fields cannot be empty or contain only spaces.');
    }

    if (isNaN(discount) || discount >= 100) {
      return res.status(400).send('Discount must be a valid number less than 100.');
    }

    // === 2. Validate & Deduplicate Variants ===
    const variantKeySet = new Set();

    // Check existing variants
    for (let i = 0; i < existingVariantIds.length; i++) {
      const id = existingVariantIds[i];
      if (removedVariantIds.includes(id)) continue;

      const size = existingVariantSizes[i]?.trim().toLowerCase();
      const color = existingVariantColors[i]?.trim().toLowerCase();
      const price = parseFloat(existingVariantPrices[i]);
      const stock = parseInt(existingVariantStocks[i]);

      if (!size || !color) {
        return res.status(400).send('Existing variant size and color cannot be empty.');
      }

      if (isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
        return res.status(400).send('Existing variant price and stock must be non-negative numbers.');
      }

      const key = `${size}-${color}`;
      if (variantKeySet.has(key)) {
        return res.status(400).send(`Duplicate existing variant: Size "${size}", Color "${color}"`);
      }
      variantKeySet.add(key);
    }

    // Check new variants
    for (let i = 0; i < newVariantSizes.length; i++) {
      const size = newVariantSizes[i]?.trim().toLowerCase();
      const color = newVariantColors[i]?.trim().toLowerCase();
      const price = parseFloat(newVariantPrices[i]);
      const stock = parseInt(newVariantStocks[i]);

      if (!size || !color) {
        return res.status(400).send('New variant size and color cannot be empty.');
      }

      if (isNaN(price) || price < 0 || isNaN(stock) || stock < 0) {
        return res.status(400).send('New variant price and stock must be non-negative numbers.');
      }

      const key = `${size}-${color}`;
      if (variantKeySet.has(key)) {
        return res.status(400).send(`Duplicate variant detected: Size "${size}", Color "${color}"`);
      }
      variantKeySet.add(key);
    }

    // === 3. Find Product ===
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // === 4. Update Basic Fields ===
    product.name = trimmedName;
    product.description = trimmedDesc;
    product.category = category;
    product.subcategory = subcategory;
    product.couponNote = trimmedCouponNote;
    product.discountPercentage = discount;
    product.highlights = trimmedHighlights.split(',').map(h => h.trim());

    // === 5. Handle Variants ===
    const existingFiles = req.files.existingVariantImages || [];
    const newFiles = req.files.newVariantImages || [];

    const updatedVariants = product.variants.map((variant, index) => {
      const idStr = variant._id.toString();
      const idxInForm = existingVariantIds.indexOf(idStr);

      if (idxInForm === -1 || removedVariantIds.includes(idStr)) {
        return { ...variant.toObject(), isDeleted: true };
      }

      const updatedVariant = {
        ...variant.toObject(),
        size: existingVariantSizes[idxInForm].trim(),
        color: existingVariantColors[idxInForm].trim(),
        price: existingVariantPrices[idxInForm],
        stock: existingVariantStocks[idxInForm],
        isDeleted: false,
      };

      if (existingFiles[idxInForm]) {
        const file = existingFiles[idxInForm];
        const fileName = `product_${Date.now()}_${file.originalname}`;
        const outputPath = path.join(__dirname, '../../public/product-images', fileName);
        updatedVariant.newImageFile = { file, fileName, outputPath };
      }

      return updatedVariant;
    });

    // === 6. Process Image for Existing Variants ===
    for (const variant of updatedVariants) {
      if (variant.newImageFile) {
        const { file, fileName, outputPath } = variant.newImageFile;
        await sharp(file.buffer)
          .resize(600, 600)
          .toFile(outputPath);
        variant.images = [`/product-images/${fileName}`];
        delete variant.newImageFile;
      }
    }

    // === 7. Add New Variants ===
    for (let i = 0; i < newVariantSizes.length; i++) {
      const imageFile = newFiles[i];
      let imagePath = [];

      if (imageFile) {
        const fileName = `product_${Date.now()}_${imageFile.originalname}`;
        const outputPath = path.join(__dirname, '../../public/product-images', fileName);
        await sharp(imageFile.buffer)
          .resize(600, 600)
          .toFile(outputPath);
        imagePath = [`/product-images/${fileName}`];
      }

      updatedVariants.push({
        size: newVariantSizes[i].trim(),
        color: newVariantColors[i].trim(),
        price: newVariantPrices[i],
        stock: newVariantStocks[i],
        images: imagePath,
        isDeleted: false,
      });
    }

    // === 8. Save Updates ===
    product.variants = updatedVariants;
    product.totalStock = updatedVariants.reduce((sum, v) => {
      return v.isDeleted ? sum : sum + parseInt(v.stock);
    }, 0);

    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Edit Product Error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const softDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Soft delete: set a flag like isDeleted = true
    await Product.findByIdAndUpdate(productId, { isDeleted: true });

    res.redirect('/admin/products'); // redirect to product list after deletion
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).send('Internal Server Error');
  }
};
const restoreProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Restore: set isDeleted = false
    await Product.findByIdAndUpdate(productId, { isDeleted: false });

    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error restoring product:', err);
    res.status(500).send('Internal Server Error');
  }
};


module.exports= {loadProductList,loadAddProductPage,addProduct,loadEditProductPage,editProduct,softDeleteProduct,restoreProduct}