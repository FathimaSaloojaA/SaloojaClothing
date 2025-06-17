const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Session = require('express-session');
const mongoose = require('mongoose');
//const { layout } = require('pdfkit/js/page');
const sessionCollection = mongoose.connection.collection('sessions');

const loadLogin = (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('admin/login',{error:null,layout:false}); // EJS view
};

const verifyLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.isAdmin) {
    return res.render('admin/login', { error: 'Access denied!' ,layout:false});
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('admin/login', { error: 'Invalid credentials!',layout:false });
  }

  req.session.admin = user._id;
  req.session.isAdmin = true;
  res.redirect('/admin/dashboard');
};

const loadDashboard =async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;

    let start = new Date();
    let end = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (range) {
      case 'today':
        start = new Date(today);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'custom':
        if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
    // Fallback to today if custom dates are invalid
    start = new Date(today);
    end = new Date();
  } else {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include entire day
  }
  break;
      default:
        start = new Date(today);
        end = new Date();
    }

    // ✅ Use correct field: orderDate (not createdAt)
    const orders = await Order.find({
      status: 'delivered',
      orderDate: { $gte: start, $lte: end }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    // You can add discounts logic later if stored separately
    const totalDiscounts = 0;
    const netRevenue = totalRevenue - totalDiscounts;

    // Other dashboard values
    const totalUsers = await User.countDocuments({ isBlocked: false });
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } });
    const lineChart = {
  labels: [],
  data: []
};

const dailySales = {};

orders.forEach(order => {
  const date = order.orderDate.toISOString().split('T')[0];
  dailySales[date] = (dailySales[date] || 0) + order.totalPrice;
});

lineChart.labels = Object.keys(dailySales);
lineChart.data = Object.values(dailySales);

// Payment method breakdown
const paymentData = {
  labels: [],
  values: []
};

const paymentCounts = {};
orders.forEach(order => {
  const method = order.paymentMethod || 'Unknown';
  paymentCounts[method] = (paymentCounts[method] || 0) + 1;
});

paymentData.labels = Object.keys(paymentCounts);
paymentData.values = Object.values(paymentCounts);

const recentOrders = await Order.find()
  .sort({ orderDate: -1 })  // newest first
  .limit(5)
  .lean();


    res.render('admin/dashboard', {
      totalUsers,
      blockedUsersCount,
      lowStockProducts,
      totalOrders,
      totalRevenue,
      totalDiscounts,
      netRevenue,
      selectedRange: range || 'today',
      startDate,
      endDate,
      layout:'admin/adminLayout',
      lineChart,
      paymentData,recentOrders
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
};

const downloadSalesReport=async (req, res) => {
  try {
    const { type, range, startDate, endDate } = req.query;

    const filter = generateDateFilter(range, startDate, endDate);
    const orders = await Order.find(filter).lean();

    if (type === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');
      sheet.columns = [
        { header: 'Order ID', key: 'orderID', width: 20 },
        { header: 'User Email', key: 'userEmail', width: 30 },
        { header: 'Amount', key: 'total', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Date', key: 'createdAt', width: 25 }
      ];
      orders.forEach(o => sheet.addRow({
        orderID: o.orderID,
  userEmail: o.userEmail,
  total: o.totalPrice,
  status: o.status,
  createdAt: new Date(o.orderDate).toLocaleString()
      }));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
      await workbook.xlsx.write(res);
      res.end();

    } else if (type === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
      doc.pipe(res);
      doc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();

      orders.forEach(order => {
        doc.fontSize(12).text(`Order ID: ${order.orderID}`);
doc.text(`Email: ${order.userEmail}`);
doc.text(`Total: ₹${order.totalPrice}`); // Use correct field
doc.text(`Status: ${order.status}`);
doc.text(`Date: ${new Date(order.orderDate).toLocaleString()}`); // Use correct field
doc.moveDown();

      });

      doc.end();
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to download report.');
  }
};

function generateDateFilter(range, startDate, endDate) {
  const now = new Date();
  let from;
  if (range === 'today') {
    from = new Date();
    from.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    from = new Date();
    from.setDate(from.getDate() - 7);
  } else if (range === 'month') {
    from = new Date();
    from.setMonth(from.getMonth() - 1);
  } else if (range === 'year') {
    from = new Date();
    from.setFullYear(from.getFullYear() - 1);
  } else if (range === 'custom' && startDate && endDate) {
    return {
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) // include full day
      }
    };
  }

  return from ? { orderDate: { $gte: from, $lte: new Date() } } : {};
}


const logout = (req, res) => {
  req.session.destroy((err) => {
      
      
      if (err) {
        console.error('Error destroying session:', err);
        
        return res.status(500).send('Logout failed.');
      }
      res.clearCookie('admin.sid'); // Clear session cookie
      res.redirect('/admin/'); // Redirect to login or landing page
    })
};

module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,downloadSalesReport,
  logout,
};
