const db = require('../config/db');
const { logAudit } = require('../utils/audit');

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const getPayments = (req, res) => {
  const { shop_id } = req.user;
  const { customer_id, start_date, end_date } = req.query;

  let query = `
    SELECT p.*, c.name as customer_name, c.phone as customer_phone
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.shop_id = ?
  `;
  const params = [shop_id];

  if (customer_id) {
    query += ' AND p.customer_id = ?';
    params.push(customer_id);
  }

  if (start_date && end_date) {
    query += ' AND p.payment_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY p.payment_date DESC';

  db.all(query, params, (err, payments) => {
    if (err) return res.status(500).json({ message: 'Error fetching payments', error: err.message });
    res.json(payments);
  });
};

const createPayment = (req, res) => {
  const { shop_id } = req.user;
  const { customer_id, amount, payment_date, payment_type, notes } = req.body;

  if (!customer_id) return res.status(400).json({ message: 'Customer is required' });
  if (asNumber(amount) <= 0) return res.status(400).json({ message: 'Amount must be > 0' });

  db.get('SELECT id FROM customers WHERE id = ? AND shop_id = ?', [customer_id, shop_id], (customerErr, customer) => {
    if (customerErr) return res.status(500).json({ message: 'Error validating customer', error: customerErr.message });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    db.run(
      'INSERT INTO payments (shop_id, customer_id, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [shop_id, customer_id, amount, payment_date, payment_type, notes],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error creating payment', error: err.message });

        logAudit({
          shop_id,
          actor_id: req.user.id,
          actor_role: req.user.role || req.user.type || 'shop_owner',
          action: 'create',
          entity_type: 'payment',
          entity_id: this.lastID,
          details: { customer_id, amount, payment_type, payment_date },
        });

        res.status(201).json({ message: 'Payment recorded successfully', payment_id: this.lastID });
      }
    );
  });
};

const getCustomerLedger = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;

  db.get('SELECT * FROM customers WHERE id = ? AND shop_id = ?', [id, shop_id], (err, customer) => {
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Get all deliveries
    db.all(
      `SELECT id,
              delivery_date as date,
              bottles_delivered,
              bottles_returned,
              (bottles_delivered * ?) as amount,
              'delivery' as type
         FROM deliveries
        WHERE shop_id = ? AND customer_id = ? AND delivery_type != 'walk_in'
        ORDER BY delivery_date, id`,
      [customer.rate_per_bottle, shop_id, id],
      (err, deliveries) => {
        // Get all payments
        db.all(
          'SELECT id, payment_date as date, amount, \"payment\" as type FROM payments WHERE shop_id = ? AND customer_id = ? ORDER BY payment_date, id',
          [shop_id, id],
          (err, payments) => {
            // Combine and sort
            const transactions = [...(deliveries || []), ...(payments || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate running balance
            let balance = 0;
            const ledger = transactions.map(t => {
              if (t.type === 'delivery') {
                balance += parseFloat(t.amount || 0);
              } else {
                balance -= parseFloat(t.amount || 0);
              }
              return { ...t, balance };
            });

            const total_billed = (deliveries || []).reduce((s, d) => s + asNumber(d.amount), 0);
            const total_paid = (payments || []).reduce((s, p) => s + asNumber(p.amount), 0);

            res.json({
              customer,
              ledger,
              totals: { total_billed, total_paid },
              current_balance: balance // +ve => pending, -ve => advance
            });
          }
        );
      }
    );
  });
};

const getOutstanding = (req, res) => {
  const { shop_id } = req.user;

  // IMPORTANT: avoid joining deliveries+payments directly (it multiplies rows and breaks sums)
  db.all(
    `
    SELECT
      c.id,
      c.name,
      c.phone,
      c.address,
      c.rate_per_bottle,
      c.payment_type,
      COALESCE(b.total_billed, 0) AS total_billed,
      COALESCE(p.total_paid, 0) AS total_paid,
      COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0) AS balance,
      COALESCE(b.total_bottles, 0) AS total_bottles,
      COALESCE(b.delivery_count, 0) AS delivery_count
    FROM customers c
    LEFT JOIN (
      SELECT
        d.customer_id,
        SUM(d.bottles_delivered * c2.rate_per_bottle) AS total_billed,
        SUM(d.bottles_delivered) AS total_bottles,
        COUNT(d.id) AS delivery_count
      FROM deliveries d
      JOIN customers c2 ON c2.id = d.customer_id
      WHERE d.shop_id = ? AND d.delivery_type != 'walk_in'
      GROUP BY d.customer_id
    ) b ON b.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, SUM(amount) AS total_paid
      FROM payments
      WHERE shop_id = ?
      GROUP BY customer_id
    ) p ON p.customer_id = c.id
    WHERE c.shop_id = ?
    ORDER BY balance DESC
    `,
    [shop_id, shop_id, shop_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Error fetching outstanding', error: err.message });

      const outstanding = rows.filter(r => asNumber(r.balance) > 0).map(r => ({ ...r, outstanding: asNumber(r.balance) }));
      const advances = rows.filter(r => asNumber(r.balance) < 0).map(r => ({ ...r, advance: Math.abs(asNumber(r.balance)) }));

      res.json({ outstanding, advances, all: rows });
    }
  );
};

module.exports = { getPayments, createPayment, getCustomerLedger, getOutstanding };
