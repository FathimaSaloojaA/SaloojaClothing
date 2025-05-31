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
  // 1️⃣ Show Register Page
  showRegisterPage: (req, res) => {
    res.render('user/register',{layout:false});
  },

  // 2️⃣ Handle Registration and Send OTP
  handleRegisterPost: async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render('user/register', { error: 'User already exists',layout:false });
      }

      // Save data temporarily in session
      req.session.tempUser = { firstName, lastName, email, password };

      // Generate OTP using your utility
      const otpCode = generateOtp();

      // Save OTP to DB
      await Otp.create({ email, code: otpCode });

      // Send OTP email using your mailer utility
      
      await mailer.sendEmail(
  email,
  'Your OTP Code',
  `Your OTP code is ${otpCode}. It expires in 5 minutes.`
);


      // Redirect to OTP verification page
      res.redirect('/verify-otp');

    } catch (err) {
      console.error('Register Error:', err);
      res.render('user/register', { error: 'Something went wrong!' ,layout:false});
    }
  },
  // Show OTP Verification Page
// 3️⃣ Show OTP Page
showOtpPage: (req, res) => {
  res.render('user/verify-otp', { error:'Any Error will be shown here', layout: false })

},
// 4️⃣ Handle OTP Verification
verifyOtp: async (req, res) => {
  try {
    const userOtp = req.body.otp;
    const tempUser = req.session.tempUser;

    if (!tempUser) {
      return res.redirect('/register');
    }

    const otpDoc = await Otp.findOne({ email: tempUser.email }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.code !== userOtp) {
      return res.render('user/verify-otp', { error: 'Invalid or expired OTP', layout: false });
    }

    // Register the user
    const hashedPassword = await bcrypt.hash(tempUser.password, 10);
    const newUser = new User({
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      password: hashedPassword
    });

    await newUser.save();

    // Clear temp data
    req.session.tempUser = null;
    await Otp.deleteMany({ email: tempUser.email }); // optional

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
    await Otp.create({ email: tempUser.email, code: otpCode, createdAt: new Date() });
    

    res.redirect('/verify-otp');
  } catch (err) {
    console.error('Resend OTP Error:', err);
    res.render('user/verify-otp', { error: 'Failed to resend OTP', layout: false });
  }
},

googleCallback: (req, res) => {
  req.session.user = req.user;
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.redirect('/login'); // or show error
    }
    
    res.redirect('/product');
  });
},


  showLoginPage: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('user/login',{error:"welcome",layout:false});
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
    res.redirect('/product'); //  or wherever you i want
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
      return res.render('user/forgot-password', { error: 'Email not registered', layout: false });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

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

  res.redirect('/login'); // or show success message
},
logoutUser: async (req, res) => {
  
  req.session.destroy((err) => {
    
    
    if (err) {
      console.error('Error destroying session:', err);
      
      return res.status(500).send('Logout failed.');
    }
    res.clearCookie('user.sid'); // Clear session cookie
    res.redirect('/'); // Redirect to login or landing page
  })
}






};
