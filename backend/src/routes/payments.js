const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getPayments, createPayment, getCustomerLedger, getOutstanding } = require('../controllers/paymentController');
const { validate } = require('../middleware/validate');
const { paymentCreateRules } = require('../middleware/validators');

router.use(authMiddleware);

router.get('/', getPayments);
router.post('/', paymentCreateRules, validate, createPayment);
router.get('/customer/:id', getCustomerLedger);
router.get('/outstanding', getOutstanding);

module.exports = router;
