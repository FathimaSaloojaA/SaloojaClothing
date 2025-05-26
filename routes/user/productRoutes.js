const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');
const {isUserLoggedIn ,checkUserBlocked}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
// <- Add this
router.get('/product',isUserLoggedIn, checkUserBlocked,productController.loadShopPage);
// userRoutes/productRoutes.js
router.get('/product/:id',checkUserBlocked,productController.loadProductDetails);


module.exports = router;
