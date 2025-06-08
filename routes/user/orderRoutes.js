const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/user/orderController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
const upload = require('../../middlewares/multerEditemail');
router.use(isUserLoggedIn,checkUserBlocked)

router.get('/', orderController.getUserOrders);


module.exports=router