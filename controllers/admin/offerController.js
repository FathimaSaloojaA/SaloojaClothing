const Offer = require('../../models/offerModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel'); 
const applyBestOfferToProduct = require('../../utils/applyBestOfferToProduct');


const loadOfferLandingPage = (req, res) => {
  res.render('admin/offer-landing', { admin: true ,layout: 'admin/adminLayout'});
};

const loadProductOfferForm = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false, isListed: true });
    res.render('admin/offer-product-form', {
      admin: true,
      layout: 'admin/adminLayout',
      products
    });
  } catch (error) {
    console.error('Error loading product offer form:', error);
    res.status(500).send('Something went wrong');
  }
};

const loadCategoryOfferForm = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('admin/offer-category-form', {
      admin: true,
      layout: 'admin/adminLayout',
      categories
    });
  } catch (error) {
    console.error('Error loading category offer form:', error);
    res.status(500).send('Something went wrong');
  }
};



const createProductOffer = async (req, res) => {
  try {
    const { name, product, discountPercentage, startDate, endDate } = req.body;

    
    const newOffer = new Offer({
      name,
      type: 'product',
      product,
      discountPercentage,
      startDate,
      endDate
    });

    await newOffer.save();

    
    await applyBestOfferToProduct(product);

    res.redirect('/admin/offers'); 
  } catch (error) {
    console.error('Error creating product offer:', error);
    res.status(500).send('Something went wrong');
  }
};


const createCategoryOffer = async (req, res) => {
  try {
    const { name, category, discountPercentage, startDate, endDate } = req.body;

    const newOffer = new Offer({
      name,
      type: 'category',
      category,
      discountPercentage,
      startDate,
      endDate
    });

    await newOffer.save();

    
    const products = await Product.find({ category });

    for (let product of products) {
      await applyBestOfferToProduct(product._id);
    }

    res.redirect('/admin/offers');
  } catch (error) {
    console.error('Error creating category offer:', error);
    res.status(500).send('Something went wrong');
  }
};

const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true })
      .populate('product')
      .populate('category')
      .sort({ createdAt: -1 });

    res.render('admin/offer-list', {
      admin: true,
      layout: 'admin/adminLayout',
      offers
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).send('Something went wrong');
  }
};

const softDeleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

   
    offer.isActive = false;
    await offer.save();

    
    if (offer.type === 'product' && offer.product) {
      await applyBestOfferToProduct(offer.product);
    } else if (offer.type === 'category' && offer.category) {
      const products = await Product.find({ category: offer.category });
      for (const product of products) {
        await applyBestOfferToProduct(product._id);
      }
    }

    res.json({ success: true, message: 'Offer successfully deactivated' });
  } catch (error) {
    console.error('Error in softDeleteOffer:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



module.exports = {
  createProductOffer,loadOfferLandingPage,createCategoryOffer,loadProductOfferForm,
  loadCategoryOfferForm,getAllOffers,softDeleteOffer
};
