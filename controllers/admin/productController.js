const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');
const Product=require('../../models/productModel');
const mongoose = require('mongoose');

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
      price,
      stock
    } = req.body;
console.log("FILES:", req.files);
    console.log("BODY:", req.body);
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return renderWithError('Product name cannot be empty or just spaces.');
    }

    if (discountPercentage && parseFloat(discountPercentage) >= 90) {
      return renderWithError('Discount percentage must be less than 90.');
    }

    if (isNaN(price) || price < 0) {
      return renderWithError('Price must be a valid non-negative number.');
    }

    if (isNaN(stock) || stock < 0) {
      return renderWithError('Stock must be a valid non-negative number.');
    }
    const categoryId = new mongoose.Types.ObjectId(category);
const subcategoryId = new mongoose.Types.ObjectId(subcategory);

    // Check for existing product under same category/subcategory
    const existingProduct = await Product.findOne({
      name: trimmedName,
      category:categoryId,
      subcategory:subcategoryId
    });

    if (existingProduct) {
      return renderWithError('Product name already exists under this category and subcategory.');
    }

    // Process images
    const imageFiles = req.files || [];
    if (imageFiles.length === 0 || imageFiles.length > 3) {
      return renderWithError('Please upload between 1 to 3 product images.');
    }

    const imagePaths = [];
    for (const file of imageFiles) {
      const fileName = `product_${Date.now()}_${file.originalname}`;
      const outputPath = path.join(__dirname, '../../public/product-images', fileName);

      await sharp(file.buffer)
        .resize(600, 600)
        .toFile(outputPath);

      imagePaths.push(`/product-images/${fileName}`);
    }

    const product = new Product({
      name: trimmedName,
      description,
      category :categoryId,
      subcategory:subcategoryId,
      highlights: highlights ? highlights.split(',').map(h => h.trim()) : [],
      couponNote,
      discountPercentage,
      price,
      stock,
      totalStock: stock,
      images: imagePaths
    });

    await product.save();
    res.redirect('/admin/products');

    // Helper
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

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const categories = await Category.find({ isDeleted: false });
    const subcategories = await Subcategory.find({ isDeleted: false });

    // Group subcategories by category ID
    const subcategoriesByCategory = {};
    subcategories.forEach(subcat => {
      const catId = subcat.category.toString();
      if (!subcategoriesByCategory[catId]) subcategoriesByCategory[catId] = [];
      subcategoriesByCategory[catId].push(subcat);
    });

    res.render('admin/editProduct', {
      product,
      categories,
      subcategoriesByCategory,
      error: null,
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
      price,
      stock,
      existingImages // get from req.body here!
    } = req.body;

    let existingImgs = existingImages || [];
    if (!Array.isArray(existingImgs)) {
      existingImgs = [existingImgs];
    }

    const trimmedName = name?.trim();
    const trimmedDesc = description?.trim();
    const trimmedHighlights = highlights?.trim();
    const trimmedCouponNote = couponNote?.trim();
    const discount = parseFloat(discountPercentage);
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);

    if (!trimmedName || !trimmedDesc) {
      return renderWithError('Product name and description cannot be empty or spaces only.');
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return renderWithError('Price must be a non-negative number.');
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return renderWithError('Stock must be a non-negative number.');
    }

    if (isNaN(discount) || discount >= 90) {
      return renderWithError('Discount must be a valid number less than 90.');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return renderWithError('Product not found.');
    }

    product.name = trimmedName;
    product.description = trimmedDesc;
    product.category = category;
    product.subcategory = subcategory || null;
    product.price = parsedPrice;
    product.stock = parsedStock;
    product.totalStock = parsedStock;
    product.discountPercentage = discount;
    product.couponNote = trimmedCouponNote || '';
    product.highlights = trimmedHighlights
      ? trimmedHighlights.split(',').map(h => h.trim())
      : [];

    const finalImages = [];

    for (let i = 0; i < 3; i++) {
      const existingImage = existingImgs[i];
      const uploadedFile = req.files?.[`replaceImage${i}`]?.[0];

      if (uploadedFile) {
        const fileName = `product_${Date.now()}_${uploadedFile.originalname}`;
        const outputPath = path.join(__dirname, '../../public/product-images', fileName);

        await sharp(uploadedFile.buffer)
          .resize(600, 600)
          .toFile(outputPath);

        finalImages.push(fileName);
      } else if (existingImage) {
        finalImages.push(existingImage);
      }
    }

    product.images = finalImages;

    await product.save();
    return res.redirect('/admin/products');

    // ================================
    // Helper for rendering with error
    // ================================
    async function renderWithError(errorMessage) {
      // Fetch categories and all subcategories again
      const categories = await Category.find({ isDeleted: false });
      const subcategories = await Subcategory.find({ isDeleted: false });

      const subcategoriesByCategory = {};
      subcategories.forEach(subcat => {
        const catId = subcat.category.toString();
        if (!subcategoriesByCategory[catId]) subcategoriesByCategory[catId] = [];
        subcategoriesByCategory[catId].push(subcat);
      });

      // Construct a product-like object with current values so form keeps inputs
      const productData = {
        _id: productId,
        name: trimmedName,
        description: trimmedDesc,
        category,
        subcategory,
        price: parsedPrice,
        stock: parsedStock,
        totalStock: parsedStock,
        discountPercentage: discount,
        couponNote: trimmedCouponNote,
        highlights: trimmedHighlights ? trimmedHighlights.split(',').map(h => h.trim()) : [],
        images: existingImgs,
      };

      return res.render('admin/editProduct', {
        product: productData,
        categories,
        subcategoriesByCategory,
        error: errorMessage,
        layout: 'admin/adminLayout'
      });
    }
  } catch (error) {
    console.error('Edit Product Error:', error);

    // fallback render with minimal data to avoid crashing
    return res.status(500).render('admin/editProduct', {
      error: 'Internal Server Error',
      product: {},
      categories: [],
      subcategoriesByCategory: {},
      layout: 'admin/adminLayout'
    });
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