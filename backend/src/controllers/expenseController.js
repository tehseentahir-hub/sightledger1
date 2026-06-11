const db = require('../config/db');

const getExpenses = (req, res) => {
  const { shop_id } = req.user;
  const { start_date, end_date, expense_type } = req.query;

  let query = `SELECT *,
                      COALESCE(paid_amount, amount) as paid_amount,
                      CASE
                        WHEN amount - COALESCE(paid_amount, amount) > 0
                        THEN amount - COALESCE(paid_amount, amount)
                        ELSE 0
                      END as outstanding_amount
                 FROM expenses
                WHERE shop_id = ?`;
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
  const {
    expense_type,
    amount,
    paid_amount,
    supplier_name,
    supplier_phone,
    description,
    expense_date
  } = req.body;

  const totalAmount = Number(amount || 0);
  const paidAmount = paid_amount === '' || paid_amount === undefined || paid_amount === null
    ? totalAmount
    : Number(paid_amount || 0);

  if (!expense_type) return res.status(400).json({ message: 'Expense type is required' });
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return res.status(400).json({ message: 'Total bill amount must be greater than zero' });
  if (!expense_date) return res.status(400).json({ message: 'Expense date is required' });
  if (!Number.isFinite(paidAmount) || paidAmount < 0) return res.status(400).json({ message: 'Paid amount cannot be negative' });
  if (paidAmount > totalAmount) return res.status(400).json({ message: 'Paid amount cannot be greater than total bill amount' });

  db.run(
    `INSERT INTO expenses
      (shop_id, expense_type, amount, paid_amount, supplier_name, supplier_phone, description, expense_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shop_id,
      expense_type,
      totalAmount,
      paidAmount,
      String(supplier_name || '').trim(),
      String(supplier_phone || '').trim(),
      description,
      expense_date
    ],
    function(err) {
      if (err) return res.status(500).json({ message: 'Error creating expense', error: err.message });
      res.status(201).json({ message: 'Expense recorded successfully', expense_id: this.lastID });
    }
  );
};

const deleteExpense = (req, res) => {
  const { shop_id, type } = req.user;
  const { id } = req.params;

  if (type === 'staff') {
    return res.status(403).json({ message: 'Only shop owner can delete expenses' });
  }

  db.run('DELETE FROM expenses WHERE id = ? AND shop_id = ?', [id, shop_id], function(err) {
    if (err) return res.status(500).json({ message: 'Error deleting expense', error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  });
};

const getExpenseSummary = (req, res) => {
  const { shop_id } = req.user;
  const { month, year } = req.query;

  const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  db.all(
    `SELECT expense_type,
            SUM(amount) as total,
            SUM(COALESCE(paid_amount, amount)) as paid,
            SUM(CASE
                  WHEN amount - COALESCE(paid_amount, amount) > 0
                  THEN amount - COALESCE(paid_amount, amount)
                  ELSE 0
                END) as outstanding
       FROM expenses
      WHERE shop_id = ? AND expense_date BETWEEN ? AND ?
      GROUP BY expense_type`,
    [shop_id, start_date, end_date],
    (err, summary) => {
      if (err) return res.status(500).json({ message: 'Error fetching expense summary', error: err.message });
      db.get(
        `SELECT SUM(amount) as total_expenses,
                SUM(COALESCE(paid_amount, amount)) as total_paid,
                SUM(CASE
                      WHEN amount - COALESCE(paid_amount, amount) > 0
                      THEN amount - COALESCE(paid_amount, amount)
                      ELSE 0
                    END) as month_payables
           FROM expenses
          WHERE shop_id = ? AND expense_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date],
        (err, total) => {
          if (err) return res.status(500).json({ message: 'Error fetching expense totals', error: err.message });
          db.get(
            `SELECT SUM(CASE
                        WHEN amount - COALESCE(paid_amount, amount) > 0
                        THEN amount - COALESCE(paid_amount, amount)
                        ELSE 0
                      END) as supplier_payables
               FROM expenses
              WHERE shop_id = ?`,
            [shop_id],
            (err, payables) => {
              if (err) return res.status(500).json({ message: 'Error fetching supplier payables', error: err.message });
              res.json({
                summary,
                total_expenses: total?.total_expenses || 0,
                total_paid: total?.total_paid || 0,
                month_payables: total?.month_payables || 0,
                supplier_payables: payables?.supplier_payables || 0
              });
            }
          );
        }
      );
    }
  );
};

module.exports = { getExpenses, createExpense, deleteExpense, getExpenseSummary };
