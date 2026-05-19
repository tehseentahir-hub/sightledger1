const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getInventory, updateInventory, getBottlesByCustomer } = require('../controllers/inventoryController');

router.use(authMiddleware);

router.get('/', getInventory);
router.put('/', updateInventory);
router.get('/by-customer', getBottlesByCustomer);

module.exports = router;

