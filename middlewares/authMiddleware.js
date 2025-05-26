
const User = require('../models/userModel');


exports.isUserLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next(); // Allow access
  } else {
    res.redirect('/login'); // Block and redirect
  }
};
exports.isAdminLoggedIn = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  return res.redirect('/admin/login');
};

exports.checkUserBlocked = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return next(); // If not logged in, skip
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
      next(); // user is fine
    }
  } catch (error) {
    console.error("Block-check middleware error:", error);
    res.status(500).send("Internal Server Error");
  }
};

/*exports.isGuestOnly = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/home'); // or wherever you want to send them
  }
  next();
};*/
