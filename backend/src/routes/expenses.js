const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getExpenses, createExpense, getExpenseSummary } = require('../controllers/expenseController');

router.use(authMiddleware);

router.get('/', getExpenses);
router.post('/', createExpense);
router.get('/summary', getExpenseSummary);

module.exports = router;