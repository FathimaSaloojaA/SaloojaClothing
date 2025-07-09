// config/cloudinaryStorage.js
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'salooja-products', // Cloudinary folder name
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

module.exports = storage;
