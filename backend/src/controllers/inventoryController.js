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

  // Get bottles with customers.
  // Source of truth is customer.deposit_bottles (which is updated on:
  // - customer create (initial deposit)
  // - customer edit (manual corrections)
  // - delivery create/delete (net delivered-returned)
  // This avoids mismatches when deposit bottles are edited.
  db.all(`
    SELECT c.id, c.name, c.phone, c.address,
           COALESCE(c.deposit_bottles, 0) as bottles_outside
    FROM customers c
    WHERE c.shop_id = ? AND c.is_active = 1
    AND COALESCE(c.deposit_bottles, 0) > 0
    ORDER BY bottles_outside DESC
  `, [shop_id], (err, customers) => {
    if (err) return res.status(500).json({ message: 'Error fetching bottles', error: err.message });
    res.json(customers);
  });
};

const reconcileInventory = (req, res) => {
  const { shop_id } = req.user;

  db.get('SELECT total_bottles, lost_damaged FROM bottles_inventory WHERE shop_id = ?', [shop_id], (invErr, inv) => {
    if (invErr) return res.status(500).json({ message: 'Error fetching inventory', error: invErr.message });

    // If inventory row doesn't exist yet, create it first (defaults).
    const ensure = (cb) => {
      if (inv) return cb(inv);
      db.run(
        'INSERT INTO bottles_inventory (shop_id, total_bottles, bottles_with_customers, bottles_in_shop, lost_damaged) VALUES (?, 50, 0, 50, 0)',
        [shop_id],
        (createErr) => {
          if (createErr) return res.status(500).json({ message: 'Error creating inventory', error: createErr.message });
          db.get('SELECT total_bottles, lost_damaged FROM bottles_inventory WHERE shop_id = ?', [shop_id], (e2, inv2) => cb(inv2 || { total_bottles: 50, lost_damaged: 0 }));
        }
      );
    };

    ensure((inventory) => {
      db.get(
        'SELECT COALESCE(SUM(COALESCE(deposit_bottles, 0)), 0) as with_customers FROM customers WHERE shop_id = ? AND is_active = 1',
        [shop_id],
        (sumErr, row) => {
          if (sumErr) return res.status(500).json({ message: 'Error recalculating bottles with customers', error: sumErr.message });

          const total = Number(inventory?.total_bottles || 0);
          const lost = Number(inventory?.lost_damaged || 0);
          const withCustomers = Number(row?.with_customers || 0);
          const inShop = Math.max(0, total - lost - withCustomers);

          db.run(
            'UPDATE bottles_inventory SET bottles_with_customers = ?, bottles_in_shop = ? WHERE shop_id = ?',
            [withCustomers, inShop, shop_id],
            function(updateErr) {
              if (updateErr) return res.status(500).json({ message: 'Error updating inventory totals', error: updateErr.message });
              res.json({ message: 'Inventory reconciled', bottles_with_customers: withCustomers, bottles_in_shop: inShop });
            }
          );
        }
      );
    });
  });
};

module.exports = { getInventory, updateInventory, getBottlesByCustomer, reconcileInventory };
