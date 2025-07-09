const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Order = require('../../models/orderModel');
const Coupon = require('../../models/couponModel');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Session = require('express-session');
const mongoose = require('mongoose');
//const { layout } = require('pdfkit/js/page');
const sessionCollection = mongoose.connection.collection('sessions');

const loadLogin = (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('admin/login',{error:null,layout:false}); 
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

const loadDashboard = async (req, res) => {
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
          start = new Date(today);
          end = new Date();
        } else {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        start = new Date(today);
        end = new Date();
    }

    const orders = await Order.find({
      status: 'delivered',
      orderDate: { $gte: start, $lte: end }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    let totalDiscounts = 0;
    let couponDiscountTotal = 0;

    for (const order of orders) {
      let productLevelDiscount = 0;

      for (const item of order.products) {
        const product = await Product.findById(item.productId).lean();
        if (!product) continue;

        const originalPrice = product.price;
        const discountedPrice = item.price;
        const quantity = item.quantity;

        const itemOriginalTotal = originalPrice * quantity;
        const itemDiscountedTotal = discountedPrice * quantity;
        const itemDiscount = itemOriginalTotal - itemDiscountedTotal;

        productLevelDiscount += itemDiscount;
      }

      totalDiscounts += productLevelDiscount;

      
      couponDiscountTotal += order.couponDiscount || 0;
    }

    const netRevenue = totalRevenue - totalDiscounts - couponDiscountTotal;

    
    const totalUsers = await User.countDocuments({ isBlocked: false });
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } });

    const lineChart = { labels: [], data: [] };
    const dailySales = {};

    orders.forEach(order => {
      const date = order.orderDate.toISOString().split('T')[0];
      dailySales[date] = (dailySales[date] || 0) + order.totalPrice;
    });

    lineChart.labels = Object.keys(dailySales);
    lineChart.data = Object.values(dailySales);

    const paymentData = { labels: [], values: [] };
    const paymentCounts = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      paymentCounts[method] = (paymentCounts[method] || 0) + 1;
    });

    paymentData.labels = Object.keys(paymentCounts);
    paymentData.values = Object.values(paymentCounts);

    const recentOrders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();

// 🥇 Best Selling Products
const productSalesMap = {};

for (const order of orders) {
  for (const item of order.products) {
    const id = item.productId.toString();
    if (!productSalesMap[id]) {
      productSalesMap[id] = { quantity: 0, revenue: 0 };
    }
    productSalesMap[id].quantity += item.quantity;
    productSalesMap[id].revenue += item.price * item.quantity;
  }
}

const bestSellingProductIds = Object.keys(productSalesMap);

const bestSellingProductsRaw = await Product.find({ _id: { $in: bestSellingProductIds } }).lean();

const bestSellingProducts = bestSellingProductsRaw.map(product => ({
  _id: product._id,
  name: product.name,
  quantitySold: productSalesMap[product._id.toString()].quantity,
  revenue: productSalesMap[product._id.toString()].revenue
}));

bestSellingProducts.sort((a, b) => b.quantitySold - a.quantitySold);

// Limit to top 10
const topSellingProducts = bestSellingProducts.slice(0, 10);

// 🥇 Best Selling Categories
const categorySalesMap = {};

for (const product of bestSellingProductsRaw) {
  const catId = product.category.toString();
  if (!categorySalesMap[catId]) {
    categorySalesMap[catId] = { quantity: 0 };
  }
  categorySalesMap[catId].quantity += productSalesMap[product._id.toString()].quantity;
}

const categoryIds = Object.keys(categorySalesMap);
const categoriesRaw = await Category.find({ _id: { $in: categoryIds } }).lean();

const bestSellingCategories = categoriesRaw.map(cat => ({
  _id: cat._id,
  name: cat.name,
  quantitySold: categorySalesMap[cat._id.toString()].quantity
}));

bestSellingCategories.sort((a, b) => b.quantitySold - a.quantitySold);

const topSellingCategories = bestSellingCategories.slice(0, 10);



    res.render('admin/dashboard', {
      totalUsers,
      blockedUsersCount,
      lowStockProducts,
      totalOrders,
      totalRevenue,
      totalDiscounts,
      couponDiscountTotal, 
      netRevenue,
      selectedRange: range || 'today',
      startDate,
      endDate,
      layout: 'admin/adminLayout',
      lineChart,
      paymentData,
      recentOrders,
      topSellingProducts,
topSellingCategories,

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
doc.text(`Total: ₹${order.totalPrice}`); 
doc.text(`Status: ${order.status}`);
doc.text(`Date: ${new Date(order.orderDate).toLocaleString()}`); 
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
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
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
      res.clearCookie('admin.sid'); 
      res.redirect('/admin/'); 
    })
};

module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,downloadSalesReport,
  logout,
};
