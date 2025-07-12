
const User = require('../models/userModel');
const passport = require('passport');

exports.isUserLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = { _id: req.session.user };
    next(); 
  } else {
    res.redirect('/login'); 
  }
};
exports.isAdminLoggedIn = (req, res, next) => {
  
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/admin/');
};


exports.checkUserBlocked = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return next(); 
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);

    if (!user || user.isBlocked) {
      req.session.destroy(err => {
  if (err) {
    console.error("Session destroy error:", err);
    return res.status(500).send("Session error");
  }
  res.redirect('/login?blocked=true');
});

    } else {
      next(); 
    }
  } catch (error) {
    console.error("Block-check middleware error:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.ensureAuthenticated=async(req, res, next)=> {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}
exports. redirectIfAuthenticated=async(req, res, next)=> {
  if (req.session.user||(req.isAuthenticated && req.isAuthenticated())) {
    return res.redirect('/product'); 
  }
  next();
}

exports. redirectIfAdminAuthenticated=async(req, res, next)=> {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

