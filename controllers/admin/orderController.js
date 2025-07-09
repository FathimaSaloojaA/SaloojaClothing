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
    const limit = 5; 
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
      'return rejected',
      'paid'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).send('Invalid order status');
    }

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order) return res.status(404).send('Order not found');

    order.status = status;

    
    if (status === 'cancelled') {
      let refundAmount = 0;

      for (const item of order.products) {
        if (item.status !== 'cancelled') {
          item.status = 'cancelled';

          
          const product = item.productId;
          if (product) {
            product.stock += item.quantity;
            await product.save();
          }
          


          
          if (!item.refunded) {
  const totalCouponDiscount = order.couponDiscount || 0;

  const totalOrderValue = order.products.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const itemTotal = item.price * item.quantity;
  const couponShare = (itemTotal / totalOrderValue) * totalCouponDiscount;

  const refund = itemTotal - couponShare;
  refundAmount += refund;
  item.refunded = true;
}

        }
      }

      if (refundAmount > 0) {
        await creditToWallet(order.userEmail, refundAmount);
        console.log(`₹${refundAmount} refunded to ${order.userEmail}'s wallet`);
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
      'ordered', 'shipped', 'paid','out for delivery', 'delivered', 'cancelled', 'return requested', 'cancel requested','returned','return rejected'
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
       
      const refundAmount = productToUpdate.quantity * productToUpdate.price;
      order.totalPrice = Math.max(0, order.totalPrice - refundAmount); 
      console.log(`Order total reduced by ₹${refundAmount.toFixed(2)} for cancelled/returned product`);

   if (!productToUpdate.refunded) {
  const totalCouponDiscount = order.couponDiscount || 0;

  const totalOrderValue = order.products.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const productTotal = productToUpdate.price * productToUpdate.quantity;
  const couponShare = (productTotal / totalOrderValue) * totalCouponDiscount;

  const refund = productTotal - couponShare;

  await creditToWallet(order.userEmail, refund);
  productToUpdate.refunded = true;

  console.log(`Refunded ₹${refund} for cancelled product to ${order.userEmail} (wallet)`);
}


    }
    await order.save();

    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).send('Server error while updating product status.');
  }
};


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

      
      if (!productItem.refunded ) {



    const totalCouponDiscount = order.couponDiscount || 0; 
const totalOrderValue = order.products.reduce((sum, item) => {
  return sum + (item.price * item.quantity);
}, 0);


const productTotal = productItem.price * productItem.quantity;


const productShare = (productTotal / totalOrderValue) * totalCouponDiscount;

const refundAmount = productTotal - productShare;
    await creditToWallet(order.userEmail, refundAmount);
    productItem.refunded = true; 
    console.log(`Refunded ₹${refundAmount} for return`);
  } 
    } else if (decision === 'reject') {
      productItem.status = 'return rejected';
    }

    
    const allResolved = order.products.every(p => p.status !== 'return requested');
    if (allResolved && order.status === 'return requested') {
      order.status = 'delivered'; 
    }

    await order.save();
    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error('Error verifying product return:', error);
    res.status(500).send('Server error');
  }
};


const verifyOrderReturn = async (req, res) => {
  try {
    const { orderID } = req.params;
    const { decision } = req.body;

    const order = await Order.findOne({ orderID }).populate('products.productId');
    if (!order || order.status !== 'return requested') {
      return res.status(400).send('Invalid return request');
    }

    if (decision === 'accept') {
  let refundAmount = 0;

  const totalCouponDiscount = order.couponDiscount || 0;

  // Calculate total order value before discount
  const totalOrderValue = order.products.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  for (const item of order.products) {
    if (item.status === 'return requested') {
      item.status = 'returned';

      if (!item.refunded) {
        const itemTotal = item.price * item.quantity;

        // Coupon share for this item
        const itemCouponShare = (itemTotal / totalOrderValue) * totalCouponDiscount;

        const itemRefund = itemTotal - itemCouponShare;

        refundAmount += itemRefund;

        item.refunded = true;
      }
    }
  }

  if (refundAmount > 0) {
    await creditToWallet(order.userEmail, Math.round(refundAmount));
    console.log(`Refunded ₹${Math.round(refundAmount)} to ${order.userEmail}`);
  }

  order.status = 'returned';
}
 else if (decision === 'reject') {
      for (const item of order.products) {
        if (item.status === 'return requested') {
          item.status = 'return rejected';
        }
      }

      order.status = 'delivered'; // fallback status
    }

    await order.save();
    res.redirect(`/admin/orders/${orderID}`);
  } catch (error) {
    console.error('Error verifying full order return:', error);
    res.status(500).send('Server error');
  }
};




module.exports = { getAllOrders,getOrderDetails,updateOrderStatus ,updateProductStatus,verifyProductReturn,verifyOrderReturn};
