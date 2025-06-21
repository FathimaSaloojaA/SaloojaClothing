// routes/userRoutes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/authController');
const passport = require('../../middlewares/passport'); // if using passport
//const otpMiddleware = require('../../middlewares/otpMiddleware'); // optional
const {redirectIfAuthenticated}= require('../../middlewares/authMiddleware');
const noCache = require('../../middlewares/nocache');
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
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  authController.googleCallback
);
// Show Login Page
router.get('/login', redirectIfAuthenticated,authController.showLoginPage);

// Handle Login Form Submission
router.post('/login', authController.postLogin);
router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.handleForgotPassword);
router.get('/reset-password', authController.getResetPasswordForm);
router.post('/reset-password', authController.postResetPassword);




// Logout
router.get('/logout', authController.logoutUser);

module.exports = router;
