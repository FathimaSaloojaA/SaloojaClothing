const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/user/profileController');
const {isUserLoggedIn ,checkUserBlocked,}= require('../../middlewares/authMiddleware'); // or whatever your middleware is
const upload = require('../../middlewares/multerEditemail');

router.use(isUserLoggedIn,checkUserBlocked)
router.get('/profile', profileController.getUserProfile);
router.get('/edit-profile',  profileController.getEditProfile);

router.post(
  '/edit-profile',
  
  upload.single('profileImage'),
  profileController.postEditProfile
);

router.get('/verify-new-email',  profileController.getVerifyNewEmail);
router.post('/verify-new-email',  profileController.postVerifyNewEmail);

router.get('/change-password',  profileController.getChangePassword);
router.post('/change-password',  profileController.postChangePassword);

router.get('/orders/:orderID',profileController.getOrderDetails)
router.post('/orders/:orderID/cancel',profileController.postCancelOrder)


module.exports = router;

