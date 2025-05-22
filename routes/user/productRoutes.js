const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');
const {isUserLoggedIn }= require('../../middlewares/authMiddleware'); // or whatever your middleware is
console.log('Loaded controller:', productController); // <- Add this
router.get('/product', isUserLoggedIn, productController.loadShopPage);

module.exports = router;
