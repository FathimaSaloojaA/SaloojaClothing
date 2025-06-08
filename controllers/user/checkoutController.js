const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const { v4: uuidv4 } = require('uuid');

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId)
      .populate('cart.productId')
      .lean();

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
    const discount = 0;
    const shipping = 0;
    const finalTotal = subtotal + tax - discount + shipping;

    const defaultAddress = user.addresses.find(addr => addr.isDefault);
    const allAddresses = user.addresses;

    res.render('user/checkout', {
      cartItems,
      subtotal,
      tax,
      discount,
      shipping,
      finalTotal,
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

const postPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const selectedAddressId = req.body.selectedAddress;

    const user = await User.findById(userId).populate('cart.productId');
    const selectedAddress = user.addresses.id(selectedAddressId);
    if (!selectedAddress) return res.redirect('/checkout');

    // Prepare product details from cart
    const products = user.cart.map(item => {
      const product = item.productId;
      const discountedPrice = product.price * (1 - (product.discountPercentage || 0) / 100);

      return {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: discountedPrice,
        status: 'ordered'
      };
    });

    const totalPrice = products.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Create new order
    const order = new Order({
      orderID: uuidv4().slice(0, 8), // shorten UUID
      userEmail: user.email,
      products,
      totalPrice,
      shippingAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        country: selectedAddress.country
      },
      paymentMethod: 'Cash on Delivery',
      status: 'pending'
    });

    await order.save();

    // Clear cart
    user.cart = [];
    await user.save();

    res.redirect(`/checkout/order-success/${order._id}`);
  } catch (err) {
    console.error('Error placing order:', err);
    res.redirect('/checkout');
  }
};

const getOrderSuccess = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.redirect('/');

    res.render('user/order-success', { order, userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'});
  } catch (err) {
    console.error('Failed to load order success page:', err);
    res.redirect('/');
  }
};



module.exports = {
  getCheckoutPage,getAddress,postAddAddress,postEditAddress,postPlaceOrder,getOrderSuccess
};
