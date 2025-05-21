const express = require('express');
const router = express.Router();
const indexController = require('../../controllers/user/indexController');

// Home page
router.get('/', indexController.loadHome);

module.exports = router;
