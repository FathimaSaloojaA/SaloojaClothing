// utils/constants.js


module.exports = {
EMAIL_FROM: process.env.EMAIL_FROM,
EMAIL_PASS: process.env.EMAIL_PASS,

GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

GOOGLE_CALLBACK_URL:
process.env.GOOGLE_CALLBACK_URL ||
'https://saloojaclothing.shop/auth/google/callback',

BASE_URL:
process.env.BASE_URL ||
'https://saloojaclothing.shop'
};
