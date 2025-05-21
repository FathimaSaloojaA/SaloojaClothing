// utils/generateOtp.js
function generateOtp() {
  // Generate a 6-digit numeric OTP as a string
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = generateOtp;
