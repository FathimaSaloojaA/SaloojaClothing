const express = require('express');
const router = express.Router();
const checkoutController = require('../../controllers/user/checkoutController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
const upload = require('../../middlewares/multerEditemail');
router.use(isUserLoggedIn,checkUserBlocked)


router.get('/', checkoutController.getCheckoutPage);
router.get('/address/:id',checkoutController.getAddress)
router.post('/add-address',checkoutController.postAddAddress)
router.post('/edit-address/:id',checkoutController.postEditAddress)
router.post('/place-order',checkoutController.postPlaceOrder)
router.get('/order-success/:id', checkoutController.getOrderSuccess);
// POST - Apply a coupon
router.post('/apply-coupon', checkoutController.postApplyCoupon);

// POST - Remove a coupon
router.post('/remove-coupon', checkoutController.postRemoveCoupon);


module.exports=router



