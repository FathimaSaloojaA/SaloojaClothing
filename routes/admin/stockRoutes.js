const express = require('express');
const router = express.Router();
const stockController = require('../../controllers/admin/stockController');
const {isAdminLoggedIn} = require('../../middlewares/authMiddleware');

router.use(isAdminLoggedIn)

router.get('/inventory', stockController.getAllProductsForStockManagement);
router.post('/inventory/update-stock/:productId', stockController.updateProductStock);


module.exports=router