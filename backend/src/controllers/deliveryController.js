const db = require('../config/db');
const { logAudit } = require('../utils/audit');

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const isDateExpired = (dateText) => {
  if (!dateText) return false;
  const today = new Date().toISOString().split('T')[0];
  return String(dateText).slice(0, 10) < today;
};

const getDeliveries = (req, res) => {
  const { shop_id } = req.user;
  const { start_date, end_date, customer_id } = req.query;

  let query = `
    SELECT d.*, c.name as customer_name, c.phone as customer_phone, c.rate_per_bottle, s.name as rider_name,
           CASE WHEN d.delivery_type = 'walk_in' THEN 1 ELSE 0 END as is_walkin
    FROM deliveries d
    LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
    LEFT JOIN staff s ON d.rider_id = s.id
    WHERE d.shop_id = ?
  `;
  const params = [shop_id];

  if (start_date && end_date) {
    query += ' AND d.delivery_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }

  if (customer_id) {
    query += " AND d.customer_id = ? AND d.delivery_type != 'walk_in'";
    params.push(customer_id);
  }

  query += ' ORDER BY d.delivery_date DESC, d.id DESC';

  db.all(query, params, (err, deliveries) => {
    if (err) return res.status(500).json({ message: 'Error fetching deliveries', error: err.message });
    res.json(deliveries);
  });
};

const createDelivery = (req, res) => {
  const { shop_id } = req.user;
  const { customer_id, is_walkin, walkin_name, walkin_rate_per_bottle, rider_id, delivery_date, bottles_delivered, bottles_returned, delivery_type, notes } = req.body;

  if (!bottles_delivered) {
    return res.status(400).json({ message: 'Bottles are required' });
  }

  // Check subscription expiry
  db.get('SELECT subscription_expiry FROM shops WHERE id = ?', [shop_id], async (err, shop) => {
    if (err || !shop) return res.status(500).json({ message: 'Error checking subscription' });

    if (isDateExpired(shop.subscription_expiry)) {
      return res.status(403).json({ message: 'Subscription expired! Contact Super Admin.', expired: true });
    }

    try {
      await runAsync('BEGIN TRANSACTION');

      let resolvedCustomerId = Number(customer_id || 0);
      let resolvedDeliveryType = delivery_type || (is_walkin ? 'walk_in' : 'home_delivery');

      if (is_walkin || resolvedDeliveryType === 'walk_in') {
        const rate = Number(walkin_rate_per_bottle);
        if (!Number.isFinite(rate) || rate <= 0) {
          await runAsync('ROLLBACK');
          return res.status(400).json({ message: 'Walk-in rate per bottle is required' });
        }
        resolvedCustomerId = 0;
        resolvedDeliveryType = 'walk_in';
      } else {
        if (!customer_id) {
          await runAsync('ROLLBACK');
          return res.status(400).json({ message: 'Customer is required for home delivery' });
        }

        const customer = await getAsync('SELECT id, deposit_bottles FROM customers WHERE id = ? AND shop_id = ?', [customer_id, shop_id]);
        if (!customer) {
          await runAsync('ROLLBACK');
          return res.status(404).json({ message: 'Customer not found' });
        }

        const netChange = Number(bottles_delivered) - Number(bottles_returned || 0);
        await runAsync(
          'UPDATE bottles_inventory SET bottles_with_customers = bottles_with_customers + ?, bottles_in_shop = bottles_in_shop - ? WHERE shop_id = ?',
          [netChange, netChange, shop_id]
        );

        const newDeposit = Number(customer.deposit_bottles || 0) + netChange;
        await runAsync('UPDATE customers SET deposit_bottles = ? WHERE id = ? AND shop_id = ?', [newDeposit, customer_id, shop_id]);
        resolvedDeliveryType = 'home_delivery';
      }

      const inserted = await runAsync(
        'INSERT INTO deliveries (shop_id, customer_id, rider_id, delivery_date, bottles_delivered, bottles_returned, delivery_type, walkin_name, walkin_rate_per_bottle, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          shop_id,
          resolvedCustomerId,
          rider_id || null,
          delivery_date,
          bottles_delivered,
          bottles_returned || 0,
          resolvedDeliveryType,
          (resolvedDeliveryType === 'walk_in') ? (walkin_name || 'Walk-in') : null,
          (resolvedDeliveryType === 'walk_in') ? Number(walkin_rate_per_bottle) : null,
          notes || ''
        ]
      );

      await runAsync('COMMIT');

      logAudit({
        shop_id,
        actor_id: req.user.id,
        actor_role: req.user.role || req.user.type || 'shop_owner',
        action: 'create',
        entity_type: 'delivery',
        entity_id: inserted.lastID,
        details: {
          customer_id: resolvedCustomerId,
          delivery_type: resolvedDeliveryType,
          bottles_delivered,
          bottles_returned: bottles_returned || 0,
        },
      });

      return res.status(201).json({ message: 'Delivery recorded successfully', delivery_id: inserted.lastID });
    } catch (txErr) {
      try { await runAsync('ROLLBACK'); } catch (_) {}
      return res.status(500).json({ message: 'Error creating delivery', error: txErr.message });
    }
  });
};

const deleteDelivery = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;

  if (req.user.type === 'staff') {
    return res.status(403).json({ message: 'Only shop owner can delete delivery records' });
  }

  db.get('SELECT * FROM deliveries WHERE id = ? AND shop_id = ?', [id, shop_id], async (err, delivery) => {
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    // Check expiry
    db.get('SELECT subscription_expiry FROM shops WHERE id = ?', [shop_id], async (err, shop) => {
      if (isDateExpired(shop.subscription_expiry)) {
        return res.status(403).json({ message: 'Subscription expired. Cannot delete.' });
      }

      try {
        await runAsync('BEGIN TRANSACTION');

        const netChange = Number(delivery.bottles_delivered) - Number(delivery.bottles_returned || 0);
        if (delivery.delivery_type !== 'walk_in') {
          await runAsync(
            'UPDATE bottles_inventory SET bottles_with_customers = bottles_with_customers - ?, bottles_in_shop = bottles_in_shop + ? WHERE shop_id = ?',
            [netChange, netChange, shop_id]
          );

          const customer = await getAsync('SELECT deposit_bottles FROM customers WHERE id = ? AND shop_id = ?', [delivery.customer_id, shop_id]);
          if (customer) {
            const newDeposit = Number(customer.deposit_bottles || 0) - netChange;
            await runAsync('UPDATE customers SET deposit_bottles = ? WHERE id = ? AND shop_id = ?', [newDeposit, delivery.customer_id, shop_id]);
          }
        }

        await runAsync('DELETE FROM deliveries WHERE id = ? AND shop_id = ?', [id, shop_id]);
        await runAsync('COMMIT');

        logAudit({
          shop_id,
          actor_id: req.user.id,
          actor_role: req.user.role || req.user.type || 'shop_owner',
          action: 'delete',
          entity_type: 'delivery',
          entity_id: Number(id),
          details: { delivery_type: delivery.delivery_type, bottles_delivered: delivery.bottles_delivered },
        });

        return res.json({ message: 'Delivery deleted successfully' });
      } catch (txErr) {
        try { await runAsync('ROLLBACK'); } catch (_) {}
        return res.status(500).json({ message: 'Error deleting delivery', error: txErr.message });
      }
    });
  });
};

const getDeliveryReport = (req, res) => {
  const { shop_id } = req.user;
  const { start_date, end_date } = req.query;

  db.all(
    `SELECT d.delivery_date, COALESCE(c.name, d.walkin_name, 'Walk-in') as customer_name, c.phone, d.bottles_delivered, d.bottles_returned,
      CASE
        WHEN d.delivery_type = 'walk_in'
        THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0)
        ELSE d.bottles_delivered * COALESCE(c.rate_per_bottle, 0)
      END as amount, d.delivery_type, s.name as rider_name
     FROM deliveries d
     LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
     LEFT JOIN staff s ON d.rider_id = s.id
     WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?
     ORDER BY d.delivery_date DESC`,
    [shop_id, start_date, end_date],
    (err, report) => {
      if (err) return res.status(500).json({ message: 'Error generating report', error: err.message });

      const summary = {
        total_deliveries: report.length,
        total_bottles: report.reduce((sum, r) => sum + r.bottles_delivered, 0),
        total_returned: report.reduce((sum, r) => sum + r.bottles_returned, 0),
        total_amount: report.reduce((sum, r) => sum + (r.amount || 0), 0)
      };

      res.json({ report, summary });
    }
  );
};

module.exports = { getDeliveries, createDelivery, deleteDelivery, getDeliveryReport };
