const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getCustomers,
  createCustomer,
  updateCustomer,
  getCustomerLedger,
  getTransactions,
  createTransaction,
  deleteTransaction,
  getPayments,
  createPayment,
  getSummary,
  getReports,
} = require('../controllers/petController');

router.use(authMiddleware);

router.get('/summary', getSummary);
router.get('/reports', getReports);

router.get('/items', getItems);
router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);

router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id/ledger', getCustomerLedger);
router.put('/customers/:id', updateCustomer);

router.get('/payments', getPayments);
router.post('/payments', createPayment);

router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);

module.exports = router;
