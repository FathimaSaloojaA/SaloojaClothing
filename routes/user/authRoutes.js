// routes/userRoutes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/authController');
//const googleAuth = require('../../middlewares/googleAuth'); // if using passport
//const otpMiddleware = require('../../middlewares/otpMiddleware'); // optional

// Show Register Page
router.get('/register', authController.showRegisterPage);

// Handle Register Form Submission → Send OTP
router.post('/register', authController.handleRegisterPost);

// Show OTP Page
router.get('/verify-otp', authController.showOtpPage);

// Handle OTP Verification
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);


// Google Signup/Login
//router.get('/auth/google', googleAuth.initiate);           // redirect to Google
//router.get('/auth/google/callback', googleAuth.callback);  // handle callback

// Show Login Page
//router.get('/login', authController.showLoginPage);

// Handle Login Form Submission
//router.post('/login', authController.handleLogin);

// Logout
//router.get('/logout', authController.logout);

module.exports = router;
