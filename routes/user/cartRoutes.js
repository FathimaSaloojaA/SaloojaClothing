// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/user/cartController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
const upload = require('../../middlewares/multerEditemail');
router.use(isUserLoggedIn,checkUserBlocked)

router.get('/', cartController.viewCart);

router.post('/add-to-cart', cartController.addToCart);
// Update quantity of a product in cart
router.post('/update-quantity/:productId', cartController.updateQuantity);

// Remove product from cart
router.post('/remove/:productId', cartController.removeFromCart);

module.exports = router;
