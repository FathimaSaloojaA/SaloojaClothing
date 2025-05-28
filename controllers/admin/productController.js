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
    const limit = 6;
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
      name: { $regex: searchQuery, $options: 'i' },
    };

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    let products = await Product.find(filter)
      .populate({
        path: 'category',
        match: { isDeleted: false }
      })
      .populate({
        path: 'subcategory',
        match: { isDeleted: false }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ❌ Filter out products where category or subcategory is not found (i.e., deleted)
    products = products.filter(p => p.category && p.subcategory);

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
    const subcategories = await Subcategory.find({ isDeleted: false });

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

    let images = [];

    for (const file of req.files) {
      const fileName = `product_${Date.now()}_${file.originalname}`;
      const outputPath = path.join(__dirname, '../../public/product-images', fileName);

      await sharp(file.buffer)
        .resize(600, 600)
        .toFile(outputPath);

      images.push(`/product-images/${fileName}`);
    }

    // Ensure these are arrays even if single values are submitted
    const variantSizesArr = Array.isArray(variantSizes) ? variantSizes : [variantSizes];
    const variantColorsArr = Array.isArray(variantColors) ? variantColors : [variantColors];
    const variantPricesArr = Array.isArray(variantPrices) ? variantPrices : [variantPrices];
    const variantStocksArr = Array.isArray(variantStocks) ? variantStocks : [variantStocks];

    const variants = [];

    for (let i = 0; i < variantSizesArr.length; i++) {
      variants.push({
        size: variantSizesArr[i],
        color: variantColorsArr[i],
        price: variantPricesArr[i],
        stock: variantStocksArr[i],
        images: [images[i]] // associate one image per variant
      });
    }

    const totalStock = variantStocksArr.reduce((sum, stock) => sum + parseInt(stock), 0);

    const product = new Product({
      name,
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
    const subcategories = await Subcategory.find({ isDeleted: false });

    res.render('admin/editProduct', {
      product,
      categories,
      subcategories,
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

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // 1. Update basic fields
    product.name = name;
    product.description = description;
    product.category = category;
    product.subcategory = subcategory;
    product.couponNote = couponNote;
    product.discountPercentage = discountPercentage;
    product.highlights = highlights ? highlights.split(',').map(h => h.trim()) : [];

    // 2. Prepare file arrays for easier indexing (handle cases where no files uploaded)
    const existingFiles = req.files.existingVariantImages || [];
    const newFiles = req.files.newVariantImages || [];

    // 3. Handle existing variants (update or soft-delete)
    const updatedVariants = product.variants.map((variant, index) => {
      const idStr = variant._id.toString();
      const idxInForm = existingVariantIds.indexOf(idStr);

      if (idxInForm === -1 || removedVariantIds.includes(idStr)) {
        // Soft delete this variant
        return { ...variant.toObject(), isDeleted: true };
      }

      // Prepare updated variant object
      const updatedVariant = {
        ...variant.toObject(),
        size: existingVariantSizes[idxInForm],
        color: existingVariantColors[idxInForm],
        price: existingVariantPrices[idxInForm],
        stock: existingVariantStocks[idxInForm],
        isDeleted: false,
      };

      // If new image uploaded for this existing variant, process & update images array
      if (existingFiles[idxInForm]) {
        // Process image with sharp
        const file = existingFiles[idxInForm];
        const fileName = `product_${Date.now()}_${file.originalname}`;
        const outputPath = path.join(__dirname, '../../public/product-images', fileName);

        // Note: await must be used, so wrap this in an async IIFE or Promise.all later
        // For now, assuming top-level await is not possible, let's collect promises
        updatedVariant.newImageFile = { file, fileName, outputPath };
      }

      return updatedVariant;
    });

    // 4. Process all images for existing variants asynchronously (sharp)
    for (const variant of updatedVariants) {
      if (variant.newImageFile) {
        const { file, fileName, outputPath } = variant.newImageFile;
        await sharp(file.buffer)
          .resize(600, 600)
          .toFile(outputPath);

        // Replace the variant's images array with new image URL
        variant.images = [`/product-images/${fileName}`];

        // Clean up temporary prop
        delete variant.newImageFile;
      }
    }

    // 5. Add new variants with images
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
        size: newVariantSizes[i],
        color: newVariantColors[i],
        price: newVariantPrices[i],
        stock: newVariantStocks[i],
        images: imagePath,
        isDeleted: false,
      });
    }

    // 6. Update variants and totalStock
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

module.exports= {loadProductList,loadAddProductPage,addProduct,loadEditProductPage,editProduct,softDeleteProduct}