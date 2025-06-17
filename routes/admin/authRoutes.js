const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/authController');
const {isAdminLoggedIn,redirectIfAdminAuthenticated} = require('../../middlewares/authMiddleware');
const noCache = require('../../middlewares/nocache');
//router.use(noCache)

// GET: Admin login page
router.get('/', redirectIfAdminAuthenticated,adminController.loadLogin);

// POST: Admin login form submit
router.post('/login', adminController.verifyLogin);

// GET: Admin dashboard (after login)
router.get('/dashboard',isAdminLoggedIn, adminController.loadDashboard);
router.get('/dashboard/download', isAdminLoggedIn,adminController.downloadSalesReport);


// GET: Admin logout
router.get('/logout',isAdminLoggedIn, adminController.logout);

module.exports = router;
