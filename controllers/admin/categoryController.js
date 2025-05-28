
const Category = require('../../models/categoryModel');
const Subcategory = require('../../models/subCategoryModel');
const Product=require('../../models/productModel');
const loadCategoryList = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
      name: { $regex: searchQuery, $options: 'i' }
    };

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch subcategories for each category
    const categoriesWithSubs = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Subcategory.find({
          category: category._id,
          isDeleted: false
        }).sort({ createdAt: -1 });

        return {
          ...category.toObject(),
          subcategories,
        };
      })
    );

    res.render('admin/categories', {
      categories: categoriesWithSubs,
      searchQuery,
      currentPage: page,
      totalPages,
      layout: 'admin/adminLayout'
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
};



const softDeleteCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    // Soft delete category
    await Category.findByIdAndUpdate(categoryId, { isDeleted: true });

    // Soft delete all subcategories under this category
    await Subcategory.updateMany(
      { category: categoryId },
      { isDeleted: true }
    );

    // Get all subcategory IDs of this category
    const subcatIds = await Subcategory.find({ category: categoryId }).distinct('_id');

    // Soft delete all products in this category
    await Product.updateMany(
      { category: categoryId },
      { isDeleted: true }
    );

    // Soft delete all products in these subcategories
    if (subcatIds.length > 0) {
      await Product.updateMany(
        { subcategory: { $in: subcatIds } },
        { isDeleted: true }
      );
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Soft delete category error:", error);
    res.status(500).send("Failed to delete category");
  }
};

const softDeleteSubcategory = async (req, res) => {
  const subcategoryId = req.params.id;

  try {
    // Soft delete subcategory
    await Subcategory.findByIdAndUpdate(subcategoryId, { isDeleted: true });

    // Soft delete all products with this subcategory
    await Product.updateMany(
      { subcategory: subcategoryId },
      { isDeleted: true }
    );

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Soft delete subcategory error:", error);
    res.status(500).send("Failed to delete subcategory");
  }
};



const loadAddCategoryForm = (req, res) => {
  res.render('admin/addCategory', { layout: 'admin/adminLayout' });
};


const addCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    const category = new Category({ name });
    await category.save();

    if (subcategories && subcategories.length > 0) {
      const subArray = Array.isArray(subcategories) ? subcategories : [subcategories];

      const subcategoryDocs = subArray.map(sub => ({
        name: sub,
        category: category._id
      }));

      await Subcategory.insertMany(subcategoryDocs);
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).send("Failed to add category");
  }
};

const getEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    const subcategories = await Subcategory.find({ category: categoryId, isDeleted: false });

    res.render('admin/editCategory', {
      category,
      subcategories,
      layout: 'admin/adminLayout'
    });
  } catch (error) {
    console.error("Error loading edit form:", error);
    res.status(500).send("Failed to load edit page");
  }
};

const updateCategory = async (req, res) => {
  const categoryId = req.params.id;
  const { categoryName, existingSubcategories, newSubcategories = [], deleteSubcategories = [] } = req.body;

  try {
    // 1. Update category name
    await Category.findByIdAndUpdate(categoryId, { name: categoryName });

    // 2. Update existing subcategories
    if (existingSubcategories) {
      for (const [subcatId, subcatName] of Object.entries(existingSubcategories)) {
        await Subcategory.findByIdAndUpdate(subcatId, { name: subcatName });
      }
    }

    // 3. Delete selected subcategories (soft delete)
    if (Array.isArray(deleteSubcategories)) {
      await Subcategory.updateMany(
        { _id: { $in: deleteSubcategories } },
        { isDeleted: true }
      );
    }

    // 4. Add new subcategories
    if (Array.isArray(newSubcategories)) {
      const newSubcatDocs = newSubcategories
        .filter(name => name && name.trim() !== '')
        .map(name => ({ name: name.trim(), category: categoryId }));

      if (newSubcatDocs.length) {
        await Subcategory.insertMany(newSubcatDocs);
      }
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).send('Something went wrong while updating the category.');
  }
};


module.exports = { loadCategoryList,softDeleteCategory,softDeleteSubcategory,loadAddCategoryForm,addCategory,getEditCategory,updateCategory};