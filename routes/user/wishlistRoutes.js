const express = require('express');
const router = express.Router();
const wishlistController = require('../../controllers/user/wishlistController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is

router.use(isUserLoggedIn,checkUserBlocked)

router.get('/',  wishlistController.viewWishlist);
router.post('/toggle/:productId', wishlistController.toggleWishlist);
module.exports=router