const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const bcrypt = require('bcrypt');
const Session = require('express-session');
const mongoose = require('mongoose');
const sessionCollection = mongoose.connection.collection('sessions');

const loadLogin = (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.render('admin/login',{error:null,layout:false}); // EJS view
};

const verifyLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.isAdmin) {
    return res.render('admin/login', { error: 'Access denied!' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('admin/login', { error: 'Invalid credentials!' });
  }

  req.session.admin = user._id;
  req.session.isAdmin = true;
  res.redirect('/admin/dashboard');
};

const loadDashboard = async(req, res) => {

    const totalUsers = await User.countDocuments({ isBlocked: false });
    const totalSessions = await sessionCollection.countDocuments();
    const lowStockProducts = await Product.find({ stock: { $lt: 5 } }).limit(5);
    const blockedUsersCount = await User.countDocuments({ isBlocked: true });
   // const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
  if (!req.session.admin) {
    return res.redirect('/admin/');
  }
  res.render('admin/dashboard',{layout:'admin/adminLayout',
    totalUsers,totalSessions,lowStockProducts,blockedUsersCount
}); // EJS view
};

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
  loadDashboard,
  logout,
};
