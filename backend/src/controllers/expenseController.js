const db = require('../config/db');

const getExpenses = (req, res) => {
  const { shop_id } = req.user;
  const { start_date, end_date, expense_type } = req.query;

  let query = 'SELECT * FROM expenses WHERE shop_id = ?';
  const params = [shop_id];

  if (start_date && end_date) {
    query += ' AND expense_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  if (expense_type) {
    query += ' AND expense_type = ?';
    params.push(expense_type);
  }

  query += ' ORDER BY expense_date DESC';

  db.all(query, params, (err, expenses) => {
    if (err) return res.status(500).json({ message: 'Error fetching expenses', error: err.message });
    res.json(expenses);
  });
};

const createExpense = (req, res) => {
  const { shop_id } = req.user;
  const { expense_type, amount, description, expense_date } = req.body;

  db.run(
    'INSERT INTO expenses (shop_id, expense_type, amount, description, expense_date) VALUES (?, ?, ?, ?, ?)',
    [shop_id, expense_type, amount, description, expense_date],
    function(err) {
      if (err) return res.status(500).json({ message: 'Error creating expense', error: err.message });
      res.status(201).json({ message: 'Expense recorded successfully', expense_id: this.lastID });
    }
  );
};

const getExpenseSummary = (req, res) => {
  const { shop_id } = req.user;
  const { month, year } = req.query;

  const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  db.all(
    `SELECT expense_type, SUM(amount) as total FROM expenses WHERE shop_id = ? AND expense_date BETWEEN ? AND ? GROUP BY expense_type`,
    [shop_id, start_date, end_date],
    (err, summary) => {
      db.get(
        `SELECT SUM(amount) as total_expenses FROM expenses WHERE shop_id = ? AND expense_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date],
        (err, total) => {
          res.json({ summary, total_expenses: total?.total_expenses || 0 });
        }
      );
    }
  );
};

module.exports = { getExpenses, createExpense, getExpenseSummary };