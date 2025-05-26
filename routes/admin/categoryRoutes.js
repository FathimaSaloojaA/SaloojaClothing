const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');

router.get('/categories', categoryController.loadCategoryList);

router.post('/category/delete/:id', categoryController.softDeleteCategory);

router.post('/subcategories/delete/:id', categoryController.softDeleteSubcategory);
// Show Add Category form
router.get('/categories/add', categoryController.loadAddCategoryForm);

// Handle category submission
router.post('/categories/add', categoryController.addCategory);
router.get('/category/edit/:id', categoryController.getEditCategory);
router.post('/category/edit/:id', categoryController.updateCategory);




module.exports = router;