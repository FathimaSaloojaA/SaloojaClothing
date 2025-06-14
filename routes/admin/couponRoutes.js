const express = require('express');
const router = express.Router();
const couponController = require('../../controllers/admin/couponController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');

router.use(isAdminLoggedIn)

router.get('/coupons', couponController.loadCoupons);           // list all coupons
router.get('/coupons/create', couponController.loadCreateForm);  // show coupon form
router.post('/coupons/create', couponController.createCoupon);   // create coupon
router.post('/coupons/delete/:id', couponController.deleteCoupon); // soft-delete
router.post('/coupons/toggle/:id', couponController.toggleCouponStatus); // activate/deactivate


module.exports=router 