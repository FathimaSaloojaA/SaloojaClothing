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
router.post('/place-order',express.json(),checkoutController.postPlaceOrder)
router.post('/verify-stock', checkoutController.verifyStockBeforePayment);

router.post('/create-razorpay-order', checkoutController.createRazorpayOrder);

router.get('/order-success/:id', checkoutController.getOrderSuccess);
router.get('/payment-failed/:orderId', checkoutController.getPaymentFailure);

// POST - Apply a coupon
router.post('/apply-coupon', checkoutController.postApplyCoupon);

// POST - Remove a coupon
router.post('/remove-coupon', checkoutController.postRemoveCoupon);


module.exports=router



