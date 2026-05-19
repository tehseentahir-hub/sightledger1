const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDeliveries, createDelivery, deleteDelivery, getDeliveryReport } = require('../controllers/deliveryController');
const { validate } = require('../middleware/validate');
const { deliveryCreateRules, deliveryDeleteRules } = require('../middleware/validators');

router.use(authMiddleware);

router.get('/', getDeliveries);
router.post('/', deliveryCreateRules, validate, createDelivery);
router.delete('/:id', deliveryDeleteRules, validate, deleteDelivery);
router.get('/report', getDeliveryReport);

module.exports = router;
