// middlewares/multerEditProduct.js
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error('Only images are allowed'));
};

const uploadEditProductImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'replaceImage0', maxCount: 1 },
  { name: 'replaceImage1', maxCount: 1 },
  { name: 'replaceImage2', maxCount: 1 },
]);

module.exports = uploadEditProductImages;
