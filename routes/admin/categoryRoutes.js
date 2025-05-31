const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/admin/categoryController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');
const noCache = require('../../middlewares/nocache');
router.use(isAdminLoggedIn)


router.get('/categories', categoryController.loadCategoryList);

router.post('/category/delete/:id', categoryController.softDeleteCategory);

router.post('/subcategories/delete/:id', categoryController.softDeleteSubcategory);
router.post('/category/restore/:id',categoryController.restoreCategory)



router.post('/subcategories/restore/:id',categoryController.restoreSubcategory)

// Show Add Category form
router.get('/categories/add', categoryController.loadAddCategoryForm);

// Handle category submission
router.post('/categories/add', categoryController.addCategory);
router.get('/category/edit/:id', categoryController.getEditCategory);
router.post('/category/edit/:id', categoryController.updateCategory);




module.exports = router;