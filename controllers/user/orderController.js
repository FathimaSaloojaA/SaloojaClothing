const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const PDFDocument = require('pdfkit');
const path = require('path');

const getUserOrders = async (req, res) => {
  try {
    const searchQuery = req.query.q?.trim().toLowerCase() || '';
    const userEmail = req.session.user.email;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;

    let orders = await Order.find({ userEmail }).sort({ orderDate: -1 }).populate('products.productId');

    
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

    
    for (const item of order.products) {
      if (item.status !== 'cancelled') {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
        item.status = 'cancel requested'; 
      }
    }

    
    order.status = 'cancel requested';
    order.cancelReason = reason || '';
    await order.save();

    res.redirect('/orders');
  } catch (err) {
    console.error('Order cancellation error:', err);
    res.status(500).send('Error cancelling order');
  }
};

const cancelProduct = async (req, res) => {
  try {
    const { orderID, productId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderID });

    if (!order) return res.redirect('/orders');

    const productItem = order.products.find(
      (item) => item.productId.toString() === productId
    );

    if (!productItem || productItem.status === 'cancelled') {
      return res.redirect('/orders');
    }

    
    if (order.status === 'cancelled' || productItem.status === 'delivered') {
      return res.redirect('/orders');
    }

    
    productItem.status = 'cancel requested';

    
    
    order.totalPrice = order.products
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.quantity * p.price, 0);


     const allRequestingCancel = order.products
  .filter((p) => p.status !== 'cancelled' && p.status !== 'delivered')
  .every((p) => p.status === 'cancel requested');

if (allRequestingCancel) {
  order.status = 'cancel requested';
  order.cancelReason = reason || '';
}


    

    await order.save();

    res.redirect('/orders');
  } catch (err) {
    console.error('Error cancelling product in order:', err);
    res.status(500).send('Error cancelling product');
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

    
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Order not eligible for return' });
    }

    order.status = 'return requested';
    order.returnReason = reason; 
    await order.save();

    return res.status(200).json({ message: 'Order returned successfully' });
  } catch (err) {
    console.error('Return error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
const returnProduct = async (req, res) => {
  try {
    const { orderID, productId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderID });

    if (!order) return res.status(404).send('Order not found');

    const productItem = order.products.find(p => p.productId.toString() === productId);

    if (!productItem || productItem.status !== 'delivered') {
      return res.status(400).send('Product not eligible for return');
    }

    productItem.status = 'return requested';
    productItem.returnReason = reason;
    const allReturned = order.products.every(p => p.status === 'returned' || p.status === 'cancelled');
if (allReturned) {
  order.status = 'returned';
}


    await order.save();

    res.status(200).send('Product returned');
  } catch (err) {
    console.error('Error returning product:', err);
    res.status(500).send('Server error');
  }
};



const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderID: orderId }).populate('products.productId');
    if (!order) return res.status(404).send('Order not found');

    const doc = new PDFDocument({ margin: 50 });
    const filename = `Invoice_${order.orderID.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    const pink = '#e91e63'; // Material pink
    const lightPink = '#fce4ec'; // Light pink background

    // --- Header ---
    doc
      .fillColor(pink)
      .fontSize(22)
      .text('Order Invoice', { align: 'center' })
      .moveDown();

    doc
      .fillColor('black')
      .fontSize(14)
      .text(`Order ID: ${order.orderID}`)
      .text(`Order Date: ${order.orderDate.toDateString()}`)
      .text(`Status: ${order.status}`)
      .text(`Payment Method: ${order.paymentMethod}`)
      .moveDown();

    // --- Shipping Address ---
    doc
      .fillColor(pink)
      .fontSize(16)
      .text('Shipping Address');

    const { street, city, state, zip, country } = order.shippingAddress;
    doc
      .fillColor('black')
      .fontSize(12)
      .text(`${street}, ${city}, ${state}, ${zip}, ${country}`)
      .moveDown();

    // --- Product List ---
    doc
      .fillColor(pink)
      .fontSize(16)
      .text('Products')
      .moveDown(0.5);

    let subtotal = 0;
    let totalProductDiscount = 0;

    order.products.forEach((prod, i) => {
      const product = prod.productId;
      const quantity = prod.quantity;
      const originalPrice = product?.price || prod.price || 0;
      const discountPercent = product?.discountPercentage || 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      const itemTotal = discountedPrice * quantity;

      subtotal += itemTotal;
      totalProductDiscount += (originalPrice - discountedPrice) * quantity;

      const safeName = (product?.name || prod.name || '').replace(/[^\x00-\x7F]/g, '');
      doc
        .fillColor('black')
        .fontSize(12)
        .text(`${i + 1}. ${safeName}`);
      doc
        .fillColor('#555')
        .text(`   Qty: ${quantity} | Price: Rs ${originalPrice.toFixed(2)} | Discount: ${discountPercent}% | Total: Rs ${itemTotal.toFixed(2)}`);
    });

    doc.moveDown();

    // --- Price Summary ---
    doc
      .fillColor(pink)
      .fontSize(16)
      .text('Price Details', { underline: true })
      .moveDown(0.5);

    doc.fillColor('black').fontSize(12);
    doc.text(`Subtotal: Rs ${subtotal.toFixed(2)}`);
    doc.text(`Product Discount: -Rs ${totalProductDiscount.toFixed(2)}`);

    if (order.couponDiscount && order.couponDiscount > 0) {
      doc.text(`Coupon Discount: -Rs ${order.couponDiscount.toFixed(2)}`);
    }

    const tax = order.tax || 0;
    if (tax > 0) doc.text(`Tax: Rs ${tax.toFixed(2)}`);

    const shipping = order.shipping || 0;
    if (shipping > 0) doc.text(`Shipping: Rs ${shipping.toFixed(2)}`);

    doc
      .moveDown(0.5)
      .fillColor(pink)
      .fontSize(14)
      .text(`Total Payable: Rs ${order.totalPrice.toFixed(2)}`, { align: 'right' });

    doc.end();

  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).send('Could not generate invoice');
  }
};



module.exports = {
  getUserOrders,postCancelOrder,cancelProduct,getOrderdetails,returnOrder,returnProduct,downloadInvoice
};
