const express = require('express');
const router = express.Router();
const productController = require('../../controllers/user/productController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is


const noCache = require('../../middlewares/nocache');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}


router.get('/product',checkUserBlocked,productController.loadShopPage);
// userRoutes/productRoutes.js,
router.get('/product/:id',checkUserBlocked,productController.loadProductDetails);


module.exports = router;
