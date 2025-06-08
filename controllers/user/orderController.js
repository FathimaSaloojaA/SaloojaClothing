const Order = require('../../models/orderModel');

const getUserOrders = async (req, res) => {
  try {
    const userEmail = req.session.user.email;

    const orders = await Order.find({ userEmail }).sort({ orderDate: -1 });

    res.render('user/orders', { orders,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Error loading your orders');
  }
};

module.exports = {
  getUserOrders
};
