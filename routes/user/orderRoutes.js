const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/user/orderController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
const upload = require('../../middlewares/multerEditemail');
router.use(isUserLoggedIn,checkUserBlocked)

router.get('/', orderController.getUserOrders);
router.post('/cancel-order/:orderId', orderController.postCancelOrder);
router.post('/cancel-product/:orderID/:productId', orderController.cancelProduct);

router.get('/viewDetails/:orderId', orderController.getOrderdetails)
router.put('/return-order/:orderId', orderController.returnOrder);
router.get('/invoice/:orderId', orderController.downloadInvoice);

router.put('/return-product/:orderID/:productId', orderController.returnProduct);




module.exports=router