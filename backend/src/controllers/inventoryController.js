const db = require('../config/db');

const getInventory = (req, res) => {
  const { shop_id } = req.user;

  db.get('SELECT * FROM bottles_inventory WHERE shop_id = ?', [shop_id], (err, inventory) => {
    if (err) return res.status(500).json({ message: 'Error fetching inventory', error: err.message });

    if (!inventory) {
      db.run('INSERT INTO bottles_inventory (shop_id, total_bottles, bottles_with_customers, bottles_in_shop) VALUES (?, 50, 0, 50)', [shop_id], (err) => {
        db.get('SELECT * FROM bottles_inventory WHERE shop_id = ?', [shop_id], (err, inv) => {
          res.json(inv);
        });
      });
    } else {
      res.json(inventory);
    }
  });
};

const updateInventory = (req, res) => {
  const { shop_id } = req.user;
  const { total_bottles, bottles_with_customers, bottles_in_shop, lost_damaged, action, count } = req.body;

  if (action === 'add') {
    db.run(
      'UPDATE bottles_inventory SET total_bottles = total_bottles + ?, bottles_in_shop = bottles_in_shop + ? WHERE shop_id = ?',
      [count, count, shop_id],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating inventory', error: err.message });
        res.json({ message: 'Inventory updated successfully' });
      }
    );
  } else if (action === 'lost') {
    db.run(
      'UPDATE bottles_inventory SET lost_damaged = lost_damaged + ?, total_bottles = total_bottles - ?, bottles_in_shop = bottles_in_shop - ? WHERE shop_id = ?',
      [count, count, count, shop_id],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating inventory', error: err.message });
        res.json({ message: 'Inventory updated successfully' });
      }
    );
  } else {
    db.run(
      'UPDATE bottles_inventory SET total_bottles = ?, bottles_with_customers = ?, bottles_in_shop = ?, lost_damaged = ? WHERE shop_id = ?',
      [total_bottles, bottles_with_customers, bottles_in_shop, lost_damaged || 0, shop_id],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating inventory', error: err.message });
        res.json({ message: 'Inventory updated successfully' });
      }
    );
  }
};

const getBottlesByCustomer = (req, res) => {
  const { shop_id } = req.user;

  // Get bottles with customers (only home deliveries, not walk-ins)
  db.all(`
    SELECT c.id, c.name, c.phone, c.address,
           COALESCE(SUM(d.bottles_delivered - COALESCE(d.bottles_returned, 0)), 0) as bottles_outside
    FROM customers c
    LEFT JOIN deliveries d ON c.id = d.customer_id AND d.delivery_type != 'walk_in'
    WHERE c.shop_id = ? AND c.is_active = 1
    GROUP BY c.id
    HAVING bottles_outside > 0
    ORDER BY bottles_outside DESC
  `, [shop_id], (err, customers) => {
    if (err) return res.status(500).json({ message: 'Error fetching bottles', error: err.message });
    res.json(customers);
  });
};

module.exports = { getInventory, updateInventory, getBottlesByCustomer };

