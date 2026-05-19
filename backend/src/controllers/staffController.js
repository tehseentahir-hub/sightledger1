const db = require('../config/db');
const bcrypt = require('bcryptjs');

const sanitizeStaff = (member) => {
  const usesGeneratedPhone = member.phone?.startsWith('rider-');
  return {
    id: member.id,
    shop_id: member.shop_id,
    name: member.name,
    phone: member.role === 'rider' && usesGeneratedPhone ? '' : member.phone,
    role: member.role,
    is_active: member.is_active,
    created_at: member.created_at,
    has_login: member.role === 'cashier',
  };
};

const getStaff = (req, res) => {
  const { shop_id } = req.user;

  db.all('SELECT * FROM staff WHERE shop_id = ? ORDER BY created_at DESC', [shop_id], (err, staff) => {
    if (err) return res.status(500).json({ message: 'Error fetching staff', error: err.message });
    res.json((staff || []).map(sanitizeStaff));
  });
};

const createStaff = (req, res) => {
  const { shop_id } = req.user;
  const { name, phone, role, password } = req.body;
  const normalizedRole = role === 'rider' ? 'rider' : 'cashier';

  if (!name?.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

  let staffPhone = String(phone || '').trim();
  let plainPassword = String(password || '').trim();

  if (normalizedRole === 'cashier') {
    if (!staffPhone) {
      return res.status(400).json({ message: 'Cashier phone is required' });
    }
    if (!plainPassword) {
      return res.status(400).json({ message: 'Cashier password is required' });
    }
  } else {
    staffPhone = staffPhone || `rider-${shop_id}-${Date.now()}`;
    plainPassword = plainPassword || `rider-${Date.now()}`;
  }

  const hashedPassword = bcrypt.hashSync(plainPassword, 10);

  db.run(
    'INSERT INTO staff (shop_id, name, phone, role, password) VALUES (?, ?, ?, ?, ?)',
    [shop_id, name.trim(), staffPhone, normalizedRole, hashedPassword],
    function(err) {
      if (err) return res.status(500).json({ message: 'Error creating staff', error: err.message });
      res.status(201).json({ message: 'Staff created successfully', staff_id: this.lastID });
    }
  );
};

const updateStaff = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;
  const { name, phone, role, password, is_active } = req.body;
  const normalizedRole = role === 'rider' ? 'rider' : 'cashier';

  db.get('SELECT * FROM staff WHERE id = ? AND shop_id = ?', [id, shop_id], (err, existing) => {
    if (err) return res.status(500).json({ message: 'Error fetching staff member', error: err.message });
    if (!existing) return res.status(404).json({ message: 'Staff not found' });

    const memberName = String(name || '').trim();
    if (!memberName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let staffPhone = String(phone || '').trim();
    if (normalizedRole === 'cashier' && !staffPhone) {
      return res.status(400).json({ message: 'Cashier phone is required' });
    }
    if (normalizedRole === 'rider') {
      staffPhone = staffPhone || (existing.phone?.startsWith('rider-') ? existing.phone : `rider-${shop_id}-${id}`);
    }

    const activeValue = typeof is_active === 'undefined' ? existing.is_active : (is_active ? 1 : 0);
    const updates = ['name = ?', 'phone = ?', 'role = ?', 'is_active = ?'];
    const params = [memberName, staffPhone, normalizedRole, activeValue];

    if (password) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(String(password).trim(), 10));
    }

    params.push(id, shop_id);

    db.run(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
      params,
      function(updateErr) {
        if (updateErr) return res.status(500).json({ message: 'Error updating staff', error: updateErr.message });
        res.json({ message: 'Staff updated successfully' });
      }
    );
  });
};

const deleteStaff = (req, res) => {
  const { id } = req.params;
  const { shop_id } = req.user;

  db.run('DELETE FROM staff WHERE id = ? AND shop_id = ?', [id, shop_id], function(err) {
    if (err) return res.status(500).json({ message: 'Error deleting staff', error: err.message });
    res.json({ message: 'Staff deleted successfully' });
  });
};

const staffLogin = (req, res) => {
  const { phone, password } = req.body;
  const { shop_id } = req.user;

  db.get('SELECT * FROM staff WHERE phone = ? AND shop_id = ?', [phone, shop_id], async (err, staff) => {
    if (err) return res.status(500).json({ message: 'Login error', error: err.message });

    if (!staff) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!staff.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');

    const token = jwt.sign(
      { id: staff.id, role: staff.role, shop_id: staff.shop_id, type: 'staff' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role,
        shop_id: staff.shop_id
      }
    });
  });
};

module.exports = { getStaff, createStaff, updateStaff, deleteStaff, staffLogin };
