// controllers/userControllers/authController.js

const User = require('../../models/userModel');
const Otp = require('../../models/otpModel');
const generateOtp = require('../../utils/generateOtp');
const mailer = require('../../utils/mailer');

const BASE_URL = require('../../utils/constants').BASE_URL;
const { EMAIL_FROM } = require('../../utils/constants');
const bcrypt = require('bcrypt');
const crypto=require('crypto');
const { error } = require('console');

module.exports = {
  
  showRegisterPage: (req, res) => {
    res.render('user/register',{layout:false});
  },

 
  handleRegisterPost: async (req, res) => {
    try {
      const { firstName, lastName, email, password,confirmPassword,referredBy } = req.body;

     
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render('user/register', { error: 'User already exists',layout:false });
      }
if (password !== confirmPassword) {
      return res.render('user/register', { error: 'Passwords do not match' ,layout:false});
    }
     
      req.session.tempUser = { firstName, lastName, email, password,confirmPassword,referredBy: referredBy ? referredBy.trim().toUpperCase() : null };

      
      const otpCode = generateOtp();

     
      await Otp.create({ email, code: otpCode });

      
      
      await mailer.sendEmail(
  email,
  'Your OTP Code',
  `Your OTP code is ${otpCode}. It expires in 1 minutes.`
);


     
      res.redirect('/verify-otp');

    } catch (err) {
      console.error('Register Error:', err);
      res.render('user/register', { error: 'Something went wrong!' ,layout:false});
    }
  },
 
showOtpPage: async (req, res) => {
  try {
    const tempUser = req.session.tempUser;
    if (!tempUser) return res.redirect('/register');

    const latestOtp = await Otp.findOne({ email: tempUser.email }).sort({ createdAt: -1 });

    res.render('user/verify-otp', {
      error: null,
      layout: false,
      otpCreatedAt: latestOtp?.createdAt?.toISOString() || new Date().toISOString()
    });
  } catch (err) {
    console.error('OTP Page Error:', err);
    res.render('user/verify-otp', {
      error: 'Failed to load OTP page',
      layout: false,
      otpCreatedAt: new Date().toISOString()
    });
  }
},


verifyOtp: async (req, res) => {
  try {
    const userOtp = req.body.otp;
    const tempUser = req.session.tempUser;

    if (!tempUser) {
      return res.redirect('/register');
    }

   
    const otpDoc = await Otp.findOne({ email: tempUser.email }).sort({ createdAt: -1 });

    const now = new Date();
    const expiresIn = 1 * 60 * 1000; // 1 minute
    const isExpired = otpDoc && (now - otpDoc.createdAt > expiresIn);

    if (!otpDoc || otpDoc.code !== userOtp || isExpired) {
      return res.render('user/verify-otp', {
        error: 'Invalid or expired OTP',
        layout: false,
        otpCreatedAt: otpDoc?.createdAt?.toISOString() || new Date().toISOString()
      });
    }

    
    const hashedPassword = await bcrypt.hash(tempUser.password, 10);

    const referralCode = `${tempUser.firstName}${Date.now()}`.toUpperCase();

    const newUser = new User({
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      password: hashedPassword,
      referralCode: referralCode,
  referredBy: tempUser.referredBy ? tempUser.referredBy.toUpperCase() : null
    });

    await newUser.save();

    if (tempUser.referredBy) {
  const referrer = await User.findOne({ referralCode: tempUser.referredBy });
  if (referrer) {
    // Reward logic: create a coupon and assign it to referrer
    const Coupon = require('../../models/couponModel');
    const uniqueCode = `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const coupon = new Coupon({
      code: uniqueCode,
      discountType: 'flat',
      discountValue: 100,
      minPurchase: 500,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // valid for 30 days
      usageLimit: 1,
      isActive: true
    });

    await coupon.save();

    
    if (!referrer.rewardCoupons) referrer.rewardCoupons = [];
    referrer.rewardCoupons.push(coupon._id);
    await referrer.save();
  }
}

    
    req.session.tempUser = null;
    
    res.redirect('/login');

  } catch (err) {
    console.error('OTP Verify Error:', err);
    res.render('user/verify-otp', { error: 'Something went wrong', layout: false });
  }
},


resendOtp: async (req, res) => {
  try {
    const tempUser = req.session.tempUser;
    if (!tempUser) return res.redirect('/register');

   
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    
    const newOtp = await Otp.create({
      email: tempUser.email,
      code: otpCode,
      createdAt: new Date()
    });

    
    await mailer.sendEmail(
      tempUser.email,
      'Your New OTP Code',
      `Your new OTP code is ${otpCode}. It expires in 1 minute.`
    );

    
    res.render('user/verify-otp', {
      layout: false,
      error: null,
      otpCreatedAt: newOtp.createdAt.toISOString()
    });

  } catch (err) {
    console.error('Resend OTP Error:', err);
    res.render('user/verify-otp', {
      layout: false,
      error: 'Failed to resend OTP',
      otpCreatedAt: new Date().toISOString()
    });
  }
},


googleCallback: (req, res) => {
  req.session.user = req.user;
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.redirect('/login'); 
    }
    
    res.redirect('/product');
  });
},


  showLoginPage: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('user/login',{error:null,layout:false});
  },

  postLogin:async(req,res)=>{
const { email, password } = req.body;
try {
    const user = await User.findOne({ email });
    if (!user) return res.render('user/login', { error: 'Invalid credentials', layout: false });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('user/login', { error: 'Invalid credentials', layout: false });
    if (user.isBlocked) {
  return res.render('user/login', { error: "Your account is blocked by admin.",layout:false });
}

    req.session.user = user;
    req.session.showPreloader = true;
    res.redirect('/'); 
  } catch (err) {
    console.error('Login Error:', err);
    res.render('user/login', { error: 'Something went wrong', layout: false });
  }
  },
  renderForgotPassword : (req, res) => {
  res.render('user/forgot-password', { layout: false,success:null,error:null });
},

handleForgotPassword : async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('user/forgot-password', { error: 'Email not registered', layout: false,success:null });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpire = Date.now() + 15 * 60 * 1000; 
    user.resetToken = token;
    user.resetTokenExpire = tokenExpire;
    await user.save();

    const resetLink = `${BASE_URL}/reset-password?token=${token}`;
    await mailer.sendEmail(user.email, 'Password Reset', `Click to reset your password: ${resetLink}`);

    res.render('user/forgot-password', { success: 'Reset link sent to your email', error:null,layout: false });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.render('user/forgot-password', { error: 'Something went wrong', layout: false });
  }
},

getResetPasswordForm : async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.render('user/reset-password', { error: 'Invalid or expired token', layout: false });
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('user/reset-password', { error: 'Token expired or invalid', layout: false });
  }

  res.render('user/reset-password', { token, layout: false });
},

postResetPassword: async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render('user/reset-password', { error: 'Passwords do not match', token, layout: false });
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('user/reset-password', { error: 'Token expired or invalid', layout: false });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpire = undefined;

  await user.save();

  res.redirect('/login'); 
},


logoutUser: async (req, res) => {
  
  req.session.destroy((err) => {
    
    
    if (err) {
      console.error('Error destroying session:', err);
      
      return res.status(500).send('Logout failed.');
    }
    res.clearCookie('user.sid'); 
    res.redirect('/'); 
  })
}






};
