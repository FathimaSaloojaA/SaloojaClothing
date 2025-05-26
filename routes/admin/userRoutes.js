
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/userController');

router.get('/users', userController.loadUserList);


router.post('/users/:id/block', userController.blockUser);
router.post('/users/:id/unblock', userController.unblockUser);
module.exports = router;