const express = require('express');
const router = express.Router();
const offerController = require('../../controllers/admin/offerController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');

router.use(isAdminLoggedIn)
router.get('/offers', offerController.loadOfferLandingPage);

// Product Offer
router.get('/offers/product', offerController.loadProductOfferForm);
router.post('/offers/product', offerController.createProductOffer);

// Category Offer
router.get('/offers/category', offerController.loadCategoryOfferForm);
router.post('/offers/category', offerController.createCategoryOffer);

router.get('/offers/list', offerController.getAllOffers);
router.patch('/offers/delete/:id', offerController.softDeleteOffer);




module.exports=router