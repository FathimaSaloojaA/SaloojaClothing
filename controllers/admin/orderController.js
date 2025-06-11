const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Wallet = require('../../models/walletModel');


const creditToWallet = async (userEmail, amount, description = 'Refund for return') => {
  try {
    let wallet = await Wallet.findOne({ userEmail });

    if (!wallet) {
      wallet = new Wallet({ userEmail, balance: 0, transactions: [] });
    }

    wallet.balance += amount;

    wallet.transactions.push({
      type: 'credit',
      amount,
      description,
      date: new Date(),
    });

    await wallet.save();
    console.log(`Wallet credited: ₹${amount} for ${userEmail}`);
  } catch (err) {
    console.error('Error crediting wallet:', err);
  }
};


const getAllOrders = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Orders per page
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { orderID: { $regex: searchRegex } },
          { userEmail: { $regex: searchRegex } },
          { status: { $regex: searchRegex } }
        ]
      };
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);

    res.render('admin/orders', {
      orders,
      search,
      currentPage: page,
      totalPages,
      layout: 'admin/adminLayout'
    });
  } catch (error) {
    console.error("Error fetching paginated orders:", error);
    res.status(500).send("Server Error");
  }
};




const getOrderDetails = async (req, res) => {
  try {
    const orderID = req.params.orderID;
  const order = await Order.findOne({ orderID }).populate('products.productId');

    if (!order) return res.status(404).send("Order not found");

    res.render('admin/orderDetails', { order,layout: 'admin/adminLayout' });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).send("Server error");
  }
};


 

// Update order-level status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderID = req.params.orderID;

    const validStatuses = [
      'pending',
      'shipped',
      'out for delivery',
      'delivered',
      'cancelled',
      'cancel requested',
      'returned',
      'return rejected'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).send('Invalid order status');
    }

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order) return res.status(404).send('Order not found');

    order.status = status;

    // 🔁 If order is cancelled, update all product statuses + restore stock
    if (status === 'cancelled') {
      for (const item of order.products) {
        if (item.status !== 'cancelled') {
          item.status = 'cancelled';

          // 🔧 Restore stock
          const product = item.productId;
          if (product) {
            product.stock += item.quantity;
            await product.save(); // update the stock in DB
          }
        }
      }
    }

    await order.save();
    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error('Admin order status update failed:', error);
    res.status(500).send('Server error');
  }
};


const updateProductStatus = async (req, res) => {
  try {
    const { orderID, productId } = req.params;
    const { status } = req.body;

    const validProductStatuses = [
      'ordered', 'shipped', 'out for delivery', 'delivered', 'cancelled', 'return requested', 'cancel requested','returned','return rejected'
    ];

    if (!validProductStatuses.includes(status)) {
      return res.status(400).send('Invalid product status provided.');
    }

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order) return res.status(404).send('Order not found.');

    const productToUpdate = order.products.find(item =>
      item.productId && item.productId._id.toString() === productId
    );

    if (!productToUpdate) return res.status(404).send('Product not found in order.');

    const oldStatus = productToUpdate.status;
    productToUpdate.status = status;
    await order.save();

    // ✅ Stock Management Logic
    if (
      (oldStatus !== 'cancelled' && status === 'cancelled') ||
      (oldStatus !== 'returned' && status === 'returned')
    ) {
      const product = await Product.findById(productId);
      if (product) {
        product.stock += productToUpdate.quantity;
        await product.save();
        console.log(`Stock updated: ${product.name} stock increased by ${productToUpdate.quantity}`);
      }
    }

    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).send('Server error while updating product status.');
  }
};

// POST /admin/orders/:orderID/products/:productId/verify-return
const verifyProductReturn = async (req, res) => {
  try {
    const { orderID, productId } = req.params;
    const { decision } = req.body;

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order) return res.status(404).send('Order not found');

    const productItem = order.products.find(item => item.productId._id.toString() === productId);
    if (!productItem) return res.status(404).send('Product not found in order');

    if (productItem.status !== 'return requested') {
      return res.status(400).send('Product is not in return requested state');
    }

    if (decision === 'accept') {
      productItem.status = 'returned';

      // ✨ Wallet credit logic here
      const refundAmount = productItem.price * productItem.quantity;
      await creditToWallet(order.userEmail, refundAmount); // Defined below
    } else if (decision === 'reject') {
      productItem.status = 'return rejected';
    }

    // If all return requests are accepted or rejected, update order status
    const allResolved = order.products.every(p => p.status !== 'return requested');
    if (allResolved && order.status === 'return requested') {
      order.status = 'delivered'; // or any neutral/default status
    }

    await order.save();
    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error('Error verifying product return:', error);
    res.status(500).send('Server error');
  }
};

// POST /admin/orders/:orderID/verify-return
const verifyOrderReturn = async (req, res) => {
  try {
    const { orderID } = req.params;
    const { decision } = req.body;

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order || order.status !== 'return requested') {
      return res.status(400).send('Invalid return request');
    }

    if (decision === 'accept') {
      for (const item of order.products) {
        if (item.status === 'return requested') {
          item.status = 'returned';
        }
      }

      // ✨ Credit full amount to wallet
      await creditToWallet(order.userEmail, order.totalPrice);
      order.status = 'returned';
    } else if (decision === 'reject') {
      for (const item of order.products) {
        if (item.status === 'return requested') {
          item.status = 'return rejected';
        }
      }
      order.status = 'delivered'; // or fallback status
    }

    await order.save();
    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error('Error verifying full order return:', error);
    res.status(500).send('Server error');
  }
};




module.exports = { getAllOrders,getOrderDetails,updateOrderStatus ,updateProductStatus,verifyProductReturn,verifyOrderReturn};
