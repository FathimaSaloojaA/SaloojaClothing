const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/authController');

// GET: Admin login page
router.get('/', adminController.loadLogin);

// POST: Admin login form submit
router.post('/login', adminController.verifyLogin);

// GET: Admin dashboard (after login)
router.get('/dashboard', adminController.loadDashboard);

// GET: Admin logout
router.get('/logout', adminController.logout);

module.exports = router;
