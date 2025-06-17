const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const { v4: uuidv4 } = require('uuid');
const Coupon = require('../../models/couponModel');

const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const dotenv = require("dotenv");
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 👇 This is NEW and only for payment pre-processing
const createRazorpayOrder = async (req, res) => {
  try {
    const amount = req.body.amount; // amount in rupees
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // convert to paisa
      currency: "INR",
      receipt: "receipt_order_" + new Date().getTime()
    });

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (err) {
    console.error("Razorpay Order Creation Error:", err);
    res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
  }
};




/*const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId)
      .populate('cart.productId')
      .lean();
// 👇 Add this below the user fetch
const availableCoupons = await Coupon.find({
  isActive: true,
  isDeleted: false,
  expiryDate: { $gte: new Date() },
  usageLimit: { $gt: 0 }
}).lean();



    if (!user) return res.redirect('/login');

    const cartItems = user.cart.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const originalPrice = product.price;
      const discountPercent = product.discountPercentage || 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      const itemTotal = discountedPrice * quantity;

      return {
        _id: product._id,
        name: product.name,
        image: product.images?.[0], // Show first image
        originalPrice,
        discountedPrice,
        discountPercent,
        quantity,
        itemTotal,
        couponNote: product.couponNote
      };
    });

    const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);
    const tax = 0;
    const discount = cartItems.reduce((acc, item) => {
  const totalOriginal = item.originalPrice * item.quantity;
  const totalDiscounted = item.discountedPrice * item.quantity;
  return acc + (totalOriginal - totalDiscounted);
}, 0);

const coupon = req.session.appliedCoupon || null;
let couponDiscount = 0;

if (coupon) {
  if (coupon.discountType === 'percentage') {
    couponDiscount = subtotal * (coupon.discountValue / 100);
  } else {
    couponDiscount = coupon.discountValue;
  }
}


    const shipping = 0;
    const finalTotal = subtotal + tax - discount - couponDiscount + shipping;
    

    const defaultAddress = user.addresses.find(addr => addr.isDefault);
    const allAddresses = user.addresses;
    const couponError = req.session.couponError || null;
    req.session.couponError = null;


    res.render('user/checkout', {
  cartItems,
  subtotal,
  tax,
  discount,
  shipping,
  finalTotal,
  couponDiscount,
  appliedCoupon: coupon,
  couponError,
  
  userEmail: user.email,
  availableCoupons,
  addresses: allAddresses,
  defaultAddressId: defaultAddress?._id?.toString() || null,
  userName: req.session.user ? req.session.user.firstName : '',
  layout: 'user/detailsLayout'
});
  } catch (err) {
    console.error('Checkout Page Error:', err);
    res.status(500).send('Internal Server Error');
  }
};*/

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId).populate('cart.productId').lean();
    if (!user) return res.redirect('/login');

    const availableCoupons = await Coupon.find({
      isActive: true,
      isDeleted: false,
      expiryDate: { $gte: new Date() },
      usageLimit: { $gt: 0 }
    }).lean();

    const cartItems = user.cart.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const originalPrice = product.price;
      const discountPercent = product.discountPercentage || 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      const itemTotal = discountedPrice * quantity;

      return {
        _id: product._id,
        name: product.name,
        image: product.images?.[0],
        originalPrice,
        discountedPrice,
        discountPercent,
        quantity,
        itemTotal,
        couponNote: product.couponNote
      };
    });

    const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);
    const tax = 0;

    const discount = cartItems.reduce((acc, item) => {
      const totalOriginal = item.originalPrice * item.quantity;
      const totalDiscounted = item.discountedPrice * item.quantity;
      return acc + (totalOriginal - totalDiscounted);
    }, 0);

    let coupon = req.session.appliedCoupon || null;
    let couponDiscount = 0;

    if (coupon) {
      if (coupon.id === 'reward') {
        const rewarded = user.rewardedCoupons.find(c => c.code === coupon.code && !c.used);
        if (!rewarded) {
          req.session.appliedCoupon = null;
          coupon = null;
        } else {
          couponDiscount = coupon.discountType === 'percentage'
            ? subtotal * (coupon.discountValue / 100)
            : coupon.discountValue;
        }
      } else {
        const dbCoupon = await Coupon.findOne({
          _id: coupon.id,
          code: coupon.code,
          isActive: true,
          isDeleted: false,
          expiryDate: { $gte: new Date() },
        });

        if (!dbCoupon) {
          req.session.appliedCoupon = null;
          coupon = null;
        } else {
          const usageCount = await Order.countDocuments({
            userEmail: user.email,
            couponCode: coupon.code
          });

          if (usageCount >= dbCoupon.usageLimit) {
            req.session.appliedCoupon = null;
            coupon = null;
          } else {
            couponDiscount = coupon.discountType === 'percentage'
              ? subtotal * (coupon.discountValue / 100)
              : coupon.discountValue;
          }
        }
      }
    }

    const shipping = 0;
    const finalTotal = subtotal + tax - discount - couponDiscount + shipping;

    const defaultAddress = user.addresses.find(addr => addr.isDefault);
    const allAddresses = user.addresses;
    const couponError = req.session.couponError || null;
    req.session.couponError = null;

    res.render('user/checkout', {
      cartItems,
      subtotal,
      tax,
      discount,
      shipping,
      finalTotal,
      couponDiscount,
      appliedCoupon: coupon,
      couponError,
      userEmail: user.email,
      availableCoupons,
      addresses: allAddresses,
      defaultAddressId: defaultAddress?._id?.toString() || null,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout'
    });

  } catch (err) {
    console.error('Checkout Page Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

const postApplyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user._id;

    const user = await User.findById(userId).populate('cart.productId');

    // ✅ First, check if coupon exists in the Coupon collection
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true, isDeleted: false });

    // ✅ Check if it's a regular coupon
    if (coupon) {
      const subtotal = user.cart.reduce((sum, item) => {
        const product = item.productId;
        const discounted = product.price * (1 - (product.discountPercentage || 0) / 100);
        return sum + (discounted * item.quantity);
      }, 0);

      if (subtotal < coupon.minPurchase) {
        req.session.couponError = `Minimum purchase of ₹${coupon.minPurchase} required to use this coupon.`;
        return res.redirect('/checkout');
      }

      req.session.appliedCoupon = {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        type: 'regular'
      };

      return res.redirect('/checkout');
    }

    // ✅ If not found in Coupon collection, check user's rewarded coupons
    const userRewardedCoupon = user.rewardedCoupons.find(c => c.code === couponCode && !c.used);
if (!userRewardedCoupon) {
  req.session.couponError = 'This referral coupon has already been used.';
  return res.redirect('/checkout');
}


    if (userRewardedCoupon) {
      // You can define a default flat value or percentage for rewarded coupons
      const REWARD_DISCOUNT = 100; // ₹100 flat discount for referral

      req.session.appliedCoupon = {
        id: 'reward', // any placeholder
        code: userRewardedCoupon.code,
        discountType: 'flat',
        discountValue: REWARD_DISCOUNT,
        type: 'referral'
      };

      return res.redirect('/checkout');
    }

    // ❌ Invalid coupon
    req.session.couponError = 'Invalid or expired coupon code.';
    return res.redirect('/checkout');

  } catch (err) {
    console.error('Apply Coupon Error:', err);
    req.session.couponError = 'Failed to apply coupon.';
    res.redirect('/checkout');
  }
};


const postRemoveCoupon = (req, res) => {
  req.session.appliedCoupon = null;
  res.redirect('/checkout');
};


const postPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const selectedAddressId = req.body.selectedAddress;

    const paymentMethod = req.body.paymentMethod || 'Cash on Delivery';
    const razorpayPaymentId = req.body.paymentId || null;

    const user = await User.findById(userId).populate('cart.productId').populate('rewardCoupons');
    const selectedAddress = user.addresses.id(selectedAddressId);
    if (!selectedAddress) return res.redirect('/checkout');

    // Prepare product details
    const products = user.cart.map(item => {
      const product = item.productId;
      const discountedPrice = product.price * (1 - (product.discountPercentage || 0) / 100);
      return {
        productId: new mongoose.Types.ObjectId(product._id),
        name: product.name,
        quantity: item.quantity,
        price: discountedPrice,
        status: 'ordered'
      };
    });

    let totalPrice = products.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // 🔐 Apply coupon
    let appliedCoupon = req.session.appliedCoupon || null;
    let couponDiscount = 0;

    if (appliedCoupon) {
      couponDiscount = appliedCoupon.discountType === 'percentage'
        ? totalPrice * (appliedCoupon.discountValue / 100)
        : appliedCoupon.discountValue;

      totalPrice -= couponDiscount;
    }

    // ✅ Create Order
    const order = new Order({
      orderID: uuidv4().slice(0, 8),
      userEmail: user.email,
      products,
      totalPrice,
      paymentMethod,
      razorpayPaymentId, // Store it if Razorpay
      status: paymentMethod === 'Razorpay' ? 'paid' : 'pending',
      shippingAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        country: selectedAddress.country
      }
    });

    await order.save();

    // 🧾 Update stock
    for (const item of user.cart) {
      const product = item.productId;
      product.stock = Math.max(0, product.stock - item.quantity);
      await product.save();
    }

    // ✅ Mark rewarded coupon as used
  // ✅ Mark rewarded coupon as used

  if (appliedCoupon?.type === 'referral') {
  const rewardedCoupon = user.rewardCoupons.find(c =>
    c.code === appliedCoupon.code && !c.used
  );
  if (rewardedCoupon) {
    rewardedCoupon.used = true;
  }
} else if (appliedCoupon?.type === 'regular') {
  await Coupon.updateOne(
    { code: appliedCoupon.code },
    { $inc: { usageLimit: -1 } } // 👈 decrease usageLimit by 1
  );
}

await user.save();

  


    // ✅ Clear cart & session coupon
    user.cart = [];
    await user.save();
    req.session.appliedCoupon = null;

    // ✅ Redirect to success page
    res.redirect(`/checkout/order-success/${order._id}`);

  } catch (err) {
    console.error('❌ Error placing order:', err);
    res.redirect('/checkout');
  }
};




const getAddress= async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const address = user.addresses.id(req.params.id);
    if (!address) return res.json({ success: false });

    res.json({ success: true, address });
  } catch (err) {
    res.json({ success: false });
  }
};

const postAddAddress=async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    const newAddress = {
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      country: req.body.country,
      isDefault: false
    };

    user.addresses.push(newAddress);
    await user.save();

    res.redirect('/checkout');
  } catch (err) {
    console.error(err);
    res.redirect('/checkout');
  }
};

const postEditAddress=async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    const address = user.addresses.id(req.params.id);
    if (!address) return res.redirect('/checkout');

    address.street = req.body.street;
    address.city = req.body.city;
    address.state = req.body.state;
    address.zip = req.body.zip;
    address.country = req.body.country;

    await user.save();
    res.redirect('/checkout');
  } catch (err) {
    console.error(err);
    res.redirect('/checkout');
  }
}




const getOrderSuccess = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.productId');
    if (!order) return res.redirect('/');

    res.render('user/order-success', { order, userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'});
  } catch (err) {
    console.error('Failed to load order success page:', err);
    res.redirect('/');
  }
};

const getPaymentFailure = async (req, res) => {
  const orderId = req.params.orderId;

  // If no order exists (like in Razorpay cancel), show a generic page
  if (orderId === 'temp') {
    return res.render('user/payment-failed', {
      orderId: null,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout'
    });
  }

  try {
    const order = await Order.findOne({ orderID: orderId });
    if (!order) return res.redirect('/');

    res.render('user/payment-failed', {
      orderId: order.orderID,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout'
    });
  } catch (err) {
    console.error('Error rendering failure page:', err);
    res.redirect('/');
  }
};



module.exports = {
  getCheckoutPage,getAddress,postAddAddress,
  postEditAddress,postPlaceOrder,getOrderSuccess,
  postApplyCoupon,postRemoveCoupon,createRazorpayOrder,getPaymentFailure
};
