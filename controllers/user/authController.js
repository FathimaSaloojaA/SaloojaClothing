// controllers/userControllers/authController.js

const User = require('../../models/userModel');
const Otp = require('../../models/otpModel');
const generateOtp = require('../../utils/generateOtp');
const mailer = require('../../utils/mailer');
const { EMAIL_FROM } = require('../../utils/constants');
const bcrypt = require('bcrypt');

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
  res.render('user/verify-otp', { error:'hey', layout: false })

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
    await mailer.sendEmail(
      tempUser.email,
      'Your OTP Code (Resent)',
      `Your new OTP code is ${otpCode}. It expires in 5 minutes.`
    );

    res.redirect('/verify-otp');
  } catch (err) {
    console.error('Resend OTP Error:', err);
    res.render('user/verify-otp', { error: 'Failed to resend OTP', layout: false });
  }
}





};
