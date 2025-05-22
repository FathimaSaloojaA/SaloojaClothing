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
/*exports.isGuestOnly = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/home'); // or wherever you want to send them
  }
  next();
};*/
