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

router.get('/add-address',  profileController.getAddAddressPage);
router.post('/add-address', profileController.postAddAddress);

router.get('/edit-address/:id', profileController.getEditAddressForm);
router.post('/edit-address/:id',  profileController.postEditAddress);

router.post('/delete-address/:addressId',  profileController.deleteAddress);
router.post('/set-default-address/:addressId', profileController.setDefaultAddress);




module.exports = router;

