// utils/mailer.js
const nodemailer = require('nodemailer');
const { EMAIL_FROM, EMAIL_PASS } = require('./constants');

const transporter = nodemailer.createTransport({
  service: 'gmail',  // or your email provider
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent to', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendEmail };
