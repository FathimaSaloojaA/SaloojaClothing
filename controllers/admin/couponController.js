const Coupon = require('../../models/couponModel');


const loadCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.render('admin/coupons/list', { coupons,layout: 'admin/adminLayout', });
  } catch (err) {
    console.error('Error loading coupons:', err);
    res.render('admin/500', { error: 'Failed to load coupons.',layout: 'admin/adminLayout', });
  }
};


const loadCreateForm = (req, res) => {
  res.render('admin/coupons/create', { error: null,layout: 'admin/adminLayout', });
};


const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      expiryDate,
      usageLimit
    } = req.body;

    if (!code || !discountType || !discountValue || !expiryDate) {
      return res.render('admin/coupons/create', {
        error: 'All required fields must be filled.',layout: 'admin/adminLayout',
      });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.render('admin/coupons/create', {
        error: 'Coupon code already exists.',layout: 'admin/adminLayout',
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      expiryDate,
      usageLimit: usageLimit || 1
    });

    await coupon.save();
    res.redirect('/admin/coupons');
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.render('admin/coupons/create', {
      error: 'Something went wrong while creating the coupon.',layout: 'admin/adminLayout',
    });
  }
};


const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.redirect('/admin/coupons');
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.render('admin/500', { error: 'Failed to delete the coupon.' ,layout: 'admin/adminLayout'});
  }
};


const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new Error('Coupon not found');

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.redirect('/admin/coupons');
  } catch (err) {
    console.error('Error toggling coupon status:', err);
    res.render('admin/500', { error: 'Failed to update coupon status.',layout: 'admin/adminLayout' });
  }
};
 module.exports={loadCoupons,loadCreateForm,createCoupon,deleteCoupon,toggleCouponStatus}