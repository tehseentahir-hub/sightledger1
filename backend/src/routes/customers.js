const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer, importCustomers } = require('../controllers/customerController');
const { validate } = require('../middleware/validate');
const { customerCreateRules, customerUpdateRules, customerDeleteRules } = require('../middleware/validators');

router.use(authMiddleware);

router.get('/', getCustomers);
router.post('/', customerCreateRules, validate, createCustomer);
router.put('/:id', customerUpdateRules, validate, updateCustomer);
router.delete('/:id', customerDeleteRules, validate, deleteCustomer);
router.post('/import', importCustomers);

module.exports = router;
