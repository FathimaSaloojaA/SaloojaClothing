// middlewares/multerAddProduct.js
const multer = require('multer');
const path = require('path');

const storage = require('../config/cloudinaryStorage'); // ⬅️ IMPORTANT: This uses Cloudinary;

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error('Only images are allowed'));
};

const uploadAddProductImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('productImages', 3); // handles multiple images as array

module.exports = uploadAddProductImages;
