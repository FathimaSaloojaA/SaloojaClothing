// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');

const { isUserLoggedIn } = require('../../middlewares/authMiddleware');

router.post('/add-to-cart', isUserLoggedIn, cartController.addToCart);

module.exports = router;
