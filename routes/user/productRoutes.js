const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');
const {isUserLoggedIn }= require('../../middlewares/authMiddleware'); // or whatever your middleware is
// <- Add this
router.get('/product',  productController.loadShopPage);
// userRoutes/productRoutes.js
router.get('/product/:id',productController.loadProductDetails);


module.exports = router;
