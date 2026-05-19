const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const isSuperAdminShop = (shop) => (
  shop?.subscription_type === 'super_admin'
);

const isDateExpired = (dateText) => {
  if (!dateText) return false;
  const today = new Date().toISOString().split('T')[0];
  return String(dateText).slice(0, 10) < today;
};

const register = async (req, res) => {
  const { shop_name, owner_name, phone, address, email, password } = req.body;

  db.get('SELECT id FROM shops WHERE email = ?', [email], async (err, existing) => {
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const startDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const expiry = expiryDate.toISOString().split('T')[0];

    db.run(
      'INSERT INTO shops (shop_name, owner_name, phone, address, email, password, subscription_type, subscription_start, subscription_expiry, customer_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shop_name, owner_name, phone, address, email, hashedPassword, 'free_trial', startDate, expiry, 100],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error creating shop', error: err.message });
        }

        db.run('INSERT INTO bottles_inventory (shop_id, total_bottles, bottles_with_customers, bottles_in_shop) VALUES (?, 50, 0, 50)', [this.lastID]);

        const token = jwt.sign(
          { id: this.lastID, role: 'shop_owner', shop_id: this.lastID },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({ message: 'Shop created successfully', token });
      }
    );
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const identifier = String(email || '').trim();

  const loginStaff = () => {
    db.get('SELECT st.*, sh.shop_name, sh.subscription_type, sh.subscription_expiry, sh.customer_limit, sh.default_refill_rate, sh.is_active as shop_is_active FROM staff st JOIN shops sh ON st.shop_id = sh.id WHERE st.phone = ?', [identifier], async (staffErr, staff) => {
      if (staffErr) {
        return res.status(500).json({ message: 'Login error', error: staffErr.message });
      }

      if (!staff) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, staff.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (!staff.is_active || !staff.shop_is_active) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      if (isDateExpired(staff.subscription_expiry)) {
        return res.status(403).json({
          message: 'Subscription expired',
          expired: true,
          subscription_type: staff.subscription_type
        });
      }

      const token = jwt.sign(
        { id: staff.id, role: staff.role, shop_id: staff.shop_id, type: 'staff' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          shop_name: staff.shop_name,
          role: staff.role,
          type: 'staff',
          shop_id: staff.shop_id,
          subscription_type: staff.subscription_type,
          subscription_expiry: staff.subscription_expiry,
          customer_limit: staff.customer_limit,
          default_refill_rate: staff.default_refill_rate || 100
        }
      });
    });
  };

  db.get('SELECT * FROM shops WHERE email = ?', [identifier], async (err, shop) => {
    if (err) {
      return res.status(500).json({ message: 'Login error', error: err.message });
    }

    if (!shop) {
      return loginStaff();
    }

    const isMatch = await bcrypt.compare(password, shop.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!shop.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Check subscription expiry
    if (isDateExpired(shop.subscription_expiry) && !isSuperAdminShop(shop)) {
      return res.status(403).json({
        message: 'Subscription expired',
        expired: true,
        subscription_type: shop.subscription_type
      });
    }

    // Get customer count
    db.get('SELECT COUNT(*) as count FROM customers WHERE shop_id = ?', [shop.id], (err, result) => {
      const customerCount = result?.count || 0;
      const customerLimit = shop.customer_limit || 100;
      const nearLimit = customerCount >= customerLimit * 0.9; // 90% of limit

      const role = isSuperAdminShop(shop) ? 'super_admin' : 'shop_owner';

      const token = jwt.sign(
        { id: shop.id, role, shop_id: shop.id },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: shop.id,
          name: shop.owner_name,
          email: shop.email,
          shop_name: shop.shop_name,
          role,
          subscription_type: shop.subscription_type,
          subscription_expiry: shop.subscription_expiry,
          customer_limit: customerLimit,
          customer_count: customerCount,
          default_refill_rate: shop.default_refill_rate || 100
        },
        warnings: nearLimit ? [{ type: 'customer_limit', message: `You have ${customerCount}/${customerLimit} customers. Near limit!` }] : []
      });
    });
  });
};

const getMe = (req, res) => {
  const { id, shop_id, type } = req.user;
  const targetShopId = type === 'staff' ? shop_id : id;

  db.get(`
    SELECT s.id, s.shop_name, s.owner_name, s.phone, s.address, s.email,
           s.subscription_type, s.subscription_start, s.subscription_expiry,
           s.customer_limit, s.custom_price, s.custom_limit, s.default_refill_rate,
           s.is_active, s.created_at, s.updated_at, COUNT(c.id) as customer_count
    FROM shops s
    LEFT JOIN customers c ON s.id = c.shop_id
    WHERE s.id = ?
    GROUP BY s.id
  `, [targetShopId], (err, shop) => {
    if (err) return res.status(500).json({ message: 'Error fetching shop info' });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  });
};

const updateMe = (req, res) => {
  const { id, role } = req.user;
  const {
    default_refill_rate,
    shop_name,
    owner_name,
    phone,
    address,
    current_password,
    new_password
  } = req.body;

  if (role !== 'shop_owner' && role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (role === 'super_admin') {
    return res.status(403).json({ message: 'Super admin settings are read-only' });
  }

  const updates = [];
  const params = [];

  if (typeof default_refill_rate !== 'undefined') {
    const rate = Number(default_refill_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(400).json({ message: 'Valid refill rate is required' });
    }
    updates.push('default_refill_rate = ?');
    params.push(rate);
  }

  if (typeof shop_name !== 'undefined') {
    if (!String(shop_name).trim()) {
      return res.status(400).json({ message: 'Shop name is required' });
    }
    updates.push('shop_name = ?');
    params.push(String(shop_name).trim());
  }

  if (typeof owner_name !== 'undefined') {
    if (!String(owner_name).trim()) {
      return res.status(400).json({ message: 'Owner name is required' });
    }
    updates.push('owner_name = ?');
    params.push(String(owner_name).trim());
  }

  if (typeof phone !== 'undefined') {
    if (!String(phone).trim()) {
      return res.status(400).json({ message: 'Phone is required' });
    }
    updates.push('phone = ?');
    params.push(String(phone).trim());
  }

  if (typeof address !== 'undefined') {
    updates.push('address = ?');
    params.push(String(address || '').trim());
  }

  const finishUpdate = () => {
    if (!updates.length) {
      return db.get('SELECT shop_name, owner_name, phone, address, default_refill_rate FROM shops WHERE id = ?', [id], (fetchErr, shop) => {
        if (fetchErr) return res.status(500).json({ message: 'Error fetching settings', error: fetchErr.message });
        res.json({ message: 'No changes made', ...shop });
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.run(
      `UPDATE shops SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating settings', error: err.message });
        db.get('SELECT shop_name, owner_name, phone, address, default_refill_rate FROM shops WHERE id = ?', [id], (fetchErr, shop) => {
          if (fetchErr) return res.status(500).json({ message: 'Error fetching updated settings', error: fetchErr.message });
          res.json({ message: 'Settings updated successfully', ...shop });
        });
      }
    );
  };

  if (new_password || current_password) {
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    return db.get('SELECT password FROM shops WHERE id = ?', [id], async (err, shop) => {
      if (err) return res.status(500).json({ message: 'Error checking password', error: err.message });
      const matches = await bcrypt.compare(String(current_password), shop.password);
      if (!matches) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      updates.push('password = ?');
      params.push(await bcrypt.hash(String(new_password), 10));
      finishUpdate();
    });
  }

  finishUpdate();
};

module.exports = { register, login, getMe, updateMe };
