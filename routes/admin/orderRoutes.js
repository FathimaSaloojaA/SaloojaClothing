const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/orderController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');

router.use(isAdminLoggedIn)

router.get('/orders', orderController.getAllOrders);
router.get('/orders/:orderID', orderController.getOrderDetails);

// Order status
router.post('/orders/:orderID/status', orderController.updateOrderStatus);
router.post('/orders/:orderID/products/:productId/status', orderController.updateProductStatus)


// Product-wise return verification
router.post('/orders/:orderID/products/:productId/verify-return', orderController.verifyProductReturn);

// Order-wise return verification
router.post('/orders/:orderID/verify-return', orderController.verifyOrderReturn);

module.exports=router