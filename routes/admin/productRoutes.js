
const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/productController');
const upload = require('../../middlewares/multer');

router.get('/products', productController.loadProductList);

router.get('/products/add', productController.loadAddProductPage);
router.post('/products/add', upload.array('productImages', 10), productController.addProduct);
router.get('/products/edit/:id', productController.loadEditProductPage);
//router.post('/products/edit/:id', upload.array('productImages', 10), productController.editProduct);

router.post('/products/edit/:id',
  upload.fields([
    { name: 'existingVariantImages', maxCount: 10 },
    { name: 'newVariantImages', maxCount: 10 }
  ]),
  productController.editProduct
);

router.get('/products/delete/:id', productController.softDeleteProduct);
module.exports=router
