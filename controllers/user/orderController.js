const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const PDFDocument = require('pdfkit');
const path = require('path');

const getUserOrders = async (req, res) => {
  try {
    const searchQuery = req.query.q?.trim().toLowerCase() || '';
    const userEmail = req.session.user.email;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    let orders = await Order.find({ userEmail }).sort({ orderDate: -1 }).populate('products.productId');

    // Filter orders in-memory if search query is present
    if (searchQuery) {
      orders = orders.filter(order => {
        const matchOrderID = order.orderID.toLowerCase().includes(searchQuery);
        const matchProduct = order.products.some(p => {
          const prodName = p.productId?.name || p.name;
          return prodName.toLowerCase().includes(searchQuery);
        });
        return matchOrderID || matchProduct;
      });
    }

    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const paginatedOrders = orders.slice((page - 1) * limit, page * limit);

    res.render('user/orders', {
      orders: paginatedOrders,
      userName: req.session.user ? req.session.user.firstName : '',
      layout: 'user/detailsLayout',
      q: req.query.q || '',
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Error loading your orders');
  }
};

const postCancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderID: orderId });

    if (!order || order.status === 'cancelled' || order.status === 'delivered') {
      return res.redirect('/orders');
    }

    // Update stock and mark each product as cancelled
    for (const item of order.products) {
      if (item.status !== 'cancelled') {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
        item.status = 'cancelled'; // VERY IMPORTANT
      }
    }

    // Update overall order
    order.status = 'cancelled';
    order.cancelReason = reason || '';
    await order.save();

    res.redirect('/orders');
  } catch (err) {
    console.error('Order cancellation error:', err);
    res.status(500).send('Error cancelling order');
  }
};


const getOrderdetails=async (req, res) => {
  
  try {
    
    
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderID: orderId }).populate({
      path: 'products.productId',
      model: 'Product',
    }).exec()
    
    

    if (!order) return res.status(404).send('Order not found');
    
    res.render('user/orderDetail', { order,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const order = await Order.findOne({ orderID: orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Only allow return if the order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Order not eligible for return' });
    }

    order.status = 'returned';
    order.cancelReason = reason; // Reuse cancelReason field to store return reason
    await order.save();

    return res.status(200).json({ message: 'Order returned successfully' });
  } catch (err) {
    console.error('Return error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderID: orderId }).populate('products.productId');

    if (!order) return res.status(404).send('Order not found');

    // Create a PDF document
    const doc = new PDFDocument();
    const filename = `Invoice_${order.orderID}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Header
    doc.fontSize(22).text('🧾 Order Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order ID: ${order.orderID}`);
    doc.text(`Order Date: ${order.orderDate.toDateString()}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown();

    // Shipping Address
    doc.fontSize(16).text('Shipping Address');
    doc.fontSize(12).text(`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.zip}, ${order.shippingAddress.country}`);
    doc.moveDown();

    // Products
    doc.fontSize(16).text('Products');
    doc.moveDown(0.5);
    order.products.forEach((prod, i) => {
      const name = prod.productId?.name || prod.name;
      doc.fontSize(12).text(`${i + 1}. ${name} | Qty: ${prod.quantity} | Price: ₹${prod.price}`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total Price: ₹${order.totalPrice.toFixed(2)}`, { align: 'right' });

    doc.end();

  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).send('Could not generate invoice');
  }
};



module.exports = {
  getUserOrders,postCancelOrder,getOrderdetails,returnOrder,downloadInvoice
};
