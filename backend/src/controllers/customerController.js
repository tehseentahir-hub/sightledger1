const db = require('../config/db');
const { logAudit } = require('../utils/audit');

const getCustomers = (req, res) => {
  const { shop_id } = req.user;

  db.all(
    'SELECT c.*, COALESCE(SUM(d.bottles_delivered - d.bottles_returned), 0) as total_bottles_outside FROM customers c LEFT JOIN deliveries d ON c.id = d.customer_id WHERE c.shop_id = ? GROUP BY c.id ORDER BY c.created_at DESC',
    [shop_id],
    (err, customers) => {
      if (err) return res.status(500).json({ message: 'Error fetching customers', error: err.message });

      const processCustomer = (index) => {
        if (index >= customers.length) return res.json(customers);

        const customer = customers[index];
        if (customer.payment_type === 'credit') {
          db.get(
            `SELECT
               COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0) as pending
             FROM customers c
             LEFT JOIN (
               SELECT customer_id, SUM(bottles_delivered * ?) as total_billed
               FROM deliveries
               WHERE shop_id = ? AND customer_id = ?
               GROUP BY customer_id
             ) b ON b.customer_id = c.id
             LEFT JOIN (
               SELECT customer_id, SUM(amount) as total_paid
               FROM payments
               WHERE shop_id = ? AND customer_id = ?
               GROUP BY customer_id
             ) p ON p.customer_id = c.id
             WHERE c.id = ? AND c.shop_id = ?`,
            [customer.rate_per_bottle, shop_id, customer.id, shop_id, customer.id, customer.id, shop_id],
            (err, result) => {
              customer.pending_amount = result?.pending || 0;
              processCustomer(index + 1);
            }
          );
        } else {
          processCustomer(index + 1);
        }
      };

      processCustomer(0);
    }
  );
};

const createCustomer = (req, res) => {
  const { shop_id } = req.user;
  const { name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles, security_deposit_amount, is_active } = req.body;

  // Check customer limit first
  db.get('SELECT COUNT(*) as count, shop.customer_limit FROM customers c JOIN shops shop ON c.shop_id = shop.id WHERE c.shop_id = ?', [shop_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error checking limit', error: err.message });

    const currentCount = result?.count || 0;
    const limit = result?.customer_limit || 100;

    if (currentCount >= limit) {
      return res.status(400).json({
        message: `Customer limit reached! You can only have ${limit} customers. Please upgrade your plan.`,
        limit_reached: true
      });
    }

    db.run(
      'INSERT INTO customers (shop_id, name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles, security_deposit_amount, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shop_id, name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles || 0, Number(security_deposit_amount || 0), is_active !== false ? 1 : 0],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error creating customer', error: err.message });

        if (deposit_bottles > 0) {
          db.run(
            'UPDATE bottles_inventory SET bottles_with_customers = bottles_with_customers + ?, bottles_in_shop = bottles_in_shop - ? WHERE shop_id = ?',
            [deposit_bottles, deposit_bottles, shop_id]
          );
        }

        logAudit({
          shop_id,
          actor_id: req.user.id,
          actor_role: req.user.role || req.user.type || 'shop_owner',
          action: 'create',
          entity_type: 'customer',
          entity_id: this.lastID,
          details: { name, payment_type, rate_per_bottle, security_deposit_amount: Number(security_deposit_amount || 0) },
        });

        res.status(201).json({ message: 'Customer created successfully', customer_id: this.lastID });
      }
    );
  });
};

const updateCustomer = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;
  const { name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles, security_deposit_amount, is_active } = req.body;

  db.run(
    'UPDATE customers SET name = ?, phone = ?, address = ?, bottle_type = ?, rate_per_bottle = ?, payment_type = ?, deposit_bottles = ?, security_deposit_amount = ?, is_active = ? WHERE id = ? AND shop_id = ?',
    [name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles, Number(security_deposit_amount || 0), is_active ? 1 : 0, id, shop_id],
    function(err) {
      if (err) return res.status(500).json({ message: 'Error updating customer', error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: 'Customer not found' });

      logAudit({
        shop_id,
        actor_id: req.user.id,
        actor_role: req.user.role || req.user.type || 'shop_owner',
        action: 'update',
        entity_type: 'customer',
        entity_id: Number(id),
        details: { name, phone, payment_type, rate_per_bottle, security_deposit_amount: Number(security_deposit_amount || 0), is_active },
      });

      res.json({ message: 'Customer updated successfully' });
    }
  );
};

const deleteCustomer = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;

  db.get('SELECT deposit_bottles FROM customers WHERE id = ? AND shop_id = ?', [id, shop_id], (err, customer) => {
    if (err) return res.status(500).json({ message: 'Error fetching customer', error: err.message });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (customer && customer.deposit_bottles > 0) {
      db.run(
        'UPDATE bottles_inventory SET bottles_with_customers = bottles_with_customers - ?, bottles_in_shop = bottles_in_shop + ? WHERE shop_id = ?',
        [customer.deposit_bottles, customer.deposit_bottles, shop_id]
      );
    }

    db.run('DELETE FROM customers WHERE id = ? AND shop_id = ?', [id, shop_id], function(err) {
      if (err) return res.status(500).json({ message: 'Error deleting customer', error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: 'Customer not found' });

      logAudit({
        shop_id,
        actor_id: req.user.id,
        actor_role: req.user.role || req.user.type || 'shop_owner',
        action: 'delete',
        entity_type: 'customer',
        entity_id: Number(id),
      });

      res.json({ message: 'Customer deleted successfully' });
    });
  });
};

const importCustomers = (req, res) => {
  const { shop_id } = req.user;
  const { customers } = req.body;

  // Check limit first
  db.get('SELECT COUNT(*) as count, shop.customer_limit FROM customers c JOIN shops shop ON c.shop_id = shop.id WHERE c.shop_id = ?', [shop_id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error checking limit' });

    const currentCount = result?.count || 0;
    const limit = result?.customer_limit || 100;
    const available = limit - currentCount;

    if (available <= 0) {
      return res.status(400).json({ message: `Customer limit reached! You can only have ${limit} customers.` });
    }

    let imported = 0;
    const toImport = customers.slice(0, available);

    toImport.forEach(c => {
      db.run(
        'INSERT INTO customers (shop_id, name, phone, address, bottle_type, rate_per_bottle, payment_type, deposit_bottles, security_deposit_amount, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [shop_id, c.name, c.phone, c.address || '', c.bottle_type || '19 Liter', c.rate_per_bottle || 100, c.payment_type || 'cash', c.deposit_bottles || 0, Number(c.security_deposit_amount || 0), 1]
      );
      imported++;
    });

    res.status(201).json({ message: `${imported} customers imported successfully. ${customers.length - imported} skipped due to limit.` });
  });
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer, importCustomers };
