const db = require('../config/db');

const ensureInventoryRow = (shop_id, callback) => {
  db.get('SELECT * FROM bottles_inventory WHERE shop_id = ?', [shop_id], (err, inventory) => {
    if (err) return callback(err);
    if (inventory) return callback(null, inventory);

    db.run(
      'INSERT INTO bottles_inventory (shop_id, total_bottles, bottles_with_customers, bottles_in_shop, lost_damaged) VALUES (?, 50, 0, 50, 0)',
      [shop_id],
      (createErr) => {
        if (createErr) return callback(createErr);
        db.get('SELECT * FROM bottles_inventory WHERE shop_id = ?', [shop_id], (fetchErr, createdInventory) => {
          callback(fetchErr, createdInventory || { shop_id, total_bottles: 50, bottles_with_customers: 0, bottles_in_shop: 50, lost_damaged: 0 });
        });
      }
    );
  });
};

const recalculateInventory = (shop_id, callback) => {
  ensureInventoryRow(shop_id, (inventoryErr, inventory) => {
    if (inventoryErr) return callback(inventoryErr);

    db.get(
      'SELECT COALESCE(SUM(COALESCE(deposit_bottles, 0)), 0) as with_customers FROM customers WHERE shop_id = ? AND is_active = 1',
      [shop_id],
      (sumErr, row) => {
        if (sumErr) return callback(sumErr);

        const total = Number(inventory?.total_bottles || 0);
        const lost = Number(inventory?.lost_damaged || 0);
        const withCustomers = Number(row?.with_customers || 0);
        const inShop = Math.max(0, total - lost - withCustomers);

        db.run(
          'UPDATE bottles_inventory SET bottles_with_customers = ?, bottles_in_shop = ? WHERE shop_id = ?',
          [withCustomers, inShop, shop_id],
          (updateErr) => {
            if (updateErr) return callback(updateErr);
            callback(null, {
              ...inventory,
              bottles_with_customers: withCustomers,
              bottles_in_shop: inShop,
            });
          }
        );
      }
    );
  });
};

const getInventory = (req, res) => {
  const { shop_id } = req.user;

  recalculateInventory(shop_id, (err, inventory) => {
    if (err) return res.status(500).json({ message: 'Error fetching inventory', error: err.message });
    res.json(inventory);
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

  recalculateInventory(shop_id, (err, inventory) => {
    if (err) return res.status(500).json({ message: 'Error recalculating inventory', error: err.message });
    res.json({
      message: 'Inventory reconciled',
      bottles_with_customers: Number(inventory?.bottles_with_customers || 0),
      bottles_in_shop: Number(inventory?.bottles_in_shop || 0),
    });
  });
};

module.exports = { getInventory, updateInventory, getBottlesByCustomer, reconcileInventory };
