
const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/productController');
//const upload = require('../../middlewares/multer');
const uploadAddProductImages  = require('../../middlewares/multerAddProduct');
const uploadEditProductImages  = require('../../middlewares/multerEditProduct');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');
//const noCache = require('../../middlewares/nocache');
router.use(isAdminLoggedIn)

router.get('/products', productController.loadProductList);

router.get('/products/add', productController.loadAddProductPage);

router.post('/products/add', uploadAddProductImages, productController.addProduct);


router.get('/products/edit/:id', productController.loadEditProductPage);

router.post('/products/edit/:id', uploadEditProductImages, productController.editProduct);


router.get('/products/delete/:id', productController.softDeleteProduct);
router.get('/products/restore/:id', productController.restoreProduct);
module.exports=router
