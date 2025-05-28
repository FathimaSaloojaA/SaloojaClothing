// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');

const { isUserLoggedIn,checkUserBlocked } = require('../../middlewares/authMiddleware');

router.post('/add-to-cart', isUserLoggedIn,checkUserBlocked, cartController.addToCart);

module.exports = router;
