const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/authController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');
const noCache = require('../../middlewares/nocache');
//router.use(noCache)

// GET: Admin login page
router.get('/', adminController.loadLogin);

// POST: Admin login form submit
router.post('/login', adminController.verifyLogin);

// GET: Admin dashboard (after login)
router.get('/dashboard',isAdminLoggedIn, adminController.loadDashboard);

// GET: Admin logout
router.get('/logout',isAdminLoggedIn, adminController.logout);

module.exports = router;
