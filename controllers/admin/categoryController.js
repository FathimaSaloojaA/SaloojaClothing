
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
      
      name: { $regex: searchQuery, $options: 'i' }
    };

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    
    const categoriesWithSubs = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Subcategory.find({
          category: category._id,
          
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
    
    await Category.findByIdAndUpdate(categoryId, { isDeleted: true });

    
    await Subcategory.updateMany(
      { category: categoryId },
      { isDeleted: true }
    );

    
    const subcatIds = await Subcategory.find({ category: categoryId }).distinct('_id');

    
    await Product.updateMany(
      { category: categoryId,stock:{$lt:10} },
      { isDeleted: true }
    );

    
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



const restoreCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    
    await Category.findByIdAndUpdate(categoryId, { isDeleted: false });

    
    await Subcategory.updateMany(
      { category: categoryId },
      { isDeleted: false }
    );

    
    const subcatIds = await Subcategory.find({ category: categoryId }).distinct('_id');

    
    await Product.updateMany(
      { category: categoryId },
      { isDeleted: false }
    );

    
    if (subcatIds.length > 0) {
      await Product.updateMany(
        { subcategory: { $in: subcatIds } },
        { isDeleted: false }
      );
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Restore category error:", error);
    res.status(500).send("Failed to restore category");
  }
};


const softDeleteSubcategory = async (req, res) => {
  const subcategoryId = req.params.id;

  try {
    
    await Subcategory.findByIdAndUpdate(subcategoryId, { isDeleted: true });

    
    await Product.updateMany(
      { subcategory: subcategoryId},
      { isDeleted: true }
    );

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Soft delete subcategory error:", error);
    res.status(500).send("Failed to delete subcategory");
  }
};

const restoreSubcategory = async (req, res) => {
  const subcategoryId = req.params.id;

  try {
    
    await Subcategory.findByIdAndUpdate(subcategoryId, { isDeleted: false });

    
    await Product.updateMany(
      { subcategory: subcategoryId },
      { isDeleted: false }
    );

    res.redirect('/admin/categories');
  } catch (error) {
    console.error("Restore subcategory error:", error);
    res.status(500).send("Failed to restore subcategory");
  }
};


const loadAddCategoryForm = (req, res) => {
  res.render('admin/addCategory', { layout: 'admin/adminLayout' });
};


const addCategory = async (req, res) => {
  try {
    let { name, subcategories } = req.body;

   
    name = name.trim();

    
    if (!name) {
      return res.render('admin/addCategory', {
        error: 'Category name cannot be empty or just spaces.',
        layout: 'admin/adminLayout'
      });
    }

    
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.render('admin/addCategory', {
        error: 'Category already exists.',
        layout: 'admin/adminLayout'
      });
    }

    
    const category = new Category({ name });
    await category.save();

    if (subcategories && subcategories.length > 0) {
      
      const subArray = Array.isArray(subcategories) ? subcategories : [subcategories];

      const trimmedSubs = subArray.map(sub => sub.trim()).filter(sub => sub !== '');

      
      if (trimmedSubs.length === 0) {
        await Category.findByIdAndDelete(category._id); 
        return res.render('admin/addCategory', {
          error: 'Subcategory names cannot be empty or just spaces.',
          layout: 'admin/adminLayout'
        });
      }

      
      const lowerCaseNames = trimmedSubs.map(name => name.toLowerCase());
      const hasDuplicate = new Set(lowerCaseNames).size !== lowerCaseNames.length;

      if (hasDuplicate) {
        await Category.findByIdAndDelete(category._id); 
        return res.render('admin/addCategory', {
          error: 'Duplicate subcategories are not allowed under the same category.',
          layout: 'admin/adminLayout'
        });
      }

      
      const subcategoryDocs = trimmedSubs.map(sub => ({
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
  const {
    categoryName,
    existingSubcategories,
    newSubcategories = [],
    deleteSubcategories = [] 
  } = req.body;

  try {
    const currentCategory = await Category.findById(categoryId);
    const allCategories = await Category.find({ _id: { $ne: categoryId } });

    
    const duplicateCategory = allCategories.find(
      cat => cat.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (duplicateCategory) {
      return res.render('admin/editCategory', {
        category: currentCategory,
        subcategories: await Subcategory.find({ category: categoryId, isDeleted: false }),
        error: 'Category name already exists.',
        layout: 'admin/adminLayout'
      });
    }

    
    const existingNames = existingSubcategories
      ? Object.values(existingSubcategories).map(name => name.trim().toLowerCase())
      : [];
    const newNames = newSubcategories.map(name => name.trim().toLowerCase()).filter(name => name !== '');

    const allSubNames = [...existingNames, ...newNames];
    const hasDuplicates = new Set(allSubNames).size !== allSubNames.length;
    if (hasDuplicates) {
      return res.render('admin/editCategory', {
        category: currentCategory,
        subcategories: await Subcategory.find({ category: categoryId, isDeleted: false }),
        error: 'Duplicate subcategory names are not allowed.',
        layout: 'admin/adminLayout'
      });
    }

   
    await Category.findByIdAndUpdate(categoryId, { name: categoryName.trim() });

    
    const deleteArray = Array.isArray(deleteSubcategories) ? deleteSubcategories : [deleteSubcategories];
    for (const subcatId of deleteArray) {
      await Subcategory.findByIdAndUpdate(subcatId, { isDeleted: true });
    }

    
    if (existingSubcategories) {
      for (const [subcatId, subcatName] of Object.entries(existingSubcategories)) {
        await Subcategory.findByIdAndUpdate(subcatId, { name: subcatName.trim() });
      }
    }

    
    const newSubcatDocs = newSubcategories
      .filter(name => name && name.trim() !== '')
      .map(name => ({
        name: name.trim(),
        category: categoryId
      }));

    if (newSubcatDocs.length > 0) {
      await Subcategory.insertMany(newSubcatDocs);
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).send('Something went wrong while updating the category.');
  }
};


module.exports = { loadCategoryList,softDeleteCategory,restoreCategory,
                  softDeleteSubcategory,restoreSubcategory,loadAddCategoryForm,
                  addCategory,getEditCategory,updateCategory};