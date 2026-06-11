const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./aquaflow.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Shops Table - SaaS Model
    db.run(`CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      subscription_type TEXT DEFAULT 'free_trial',
      subscription_start TEXT,
      subscription_expiry TEXT,
      customer_limit INTEGER DEFAULT 100,
      custom_price REAL DEFAULT 0,
      custom_limit INTEGER DEFAULT 0,
      business_mode TEXT DEFAULT 'water_19l',
      default_refill_rate REAL DEFAULT 100,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`ALTER TABLE shops ADD COLUMN custom_price REAL DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE shops ADD COLUMN custom_limit INTEGER DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE shops ADD COLUMN business_mode TEXT DEFAULT 'water_19l'`, (err) => {});
    db.run(`ALTER TABLE shops ADD COLUMN default_refill_rate REAL DEFAULT 100`, (err) => {});

    // Plans Table - Updated with customer limits
    db.run(`CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_name TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      customer_limit INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Audit Log Table
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER,
      actor_id INTEGER,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Customers Table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      bottle_type TEXT DEFAULT '19 Liter',
      rate_per_bottle REAL NOT NULL,
      payment_type TEXT DEFAULT 'cash',
      deposit_bottles INTEGER DEFAULT 0,
      security_deposit_amount REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);

    // Deliveries Table
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      rider_id INTEGER,
      delivery_date TEXT NOT NULL,
      bottles_delivered INTEGER NOT NULL,
      bottles_returned INTEGER DEFAULT 0,
      delivery_type TEXT DEFAULT 'home_delivery',
      walkin_name TEXT,
      walkin_rate_per_bottle REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(rider_id) REFERENCES staff(id)
    )`);

    // Payments Table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_type TEXT DEFAULT 'partial',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`);

    // Bottles Inventory Table
    db.run(`CREATE TABLE IF NOT EXISTS bottles_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER UNIQUE NOT NULL,
      total_bottles INTEGER DEFAULT 0,
      bottles_with_customers INTEGER DEFAULT 0,
      bottles_in_shop INTEGER DEFAULT 0,
      lost_damaged INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);

    // Expenses Table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      expense_type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);


    // Staff Table
    db.run(`CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'rider',
      password TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT DEFAULT 'PET Bottle',
      size_label TEXT NOT NULL,
      unit_type TEXT DEFAULT 'pieces',
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      opening_stock INTEGER DEFAULT 0,
      min_stock_alert INTEGER DEFAULT 20,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);

    db.run(`ALTER TABLE inventory_items ADD COLUMN min_stock_alert INTEGER DEFAULT 20`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS pet_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      customer_type TEXT DEFAULT 'Retail',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      customer_id INTEGER,
      invoice_number TEXT,
      txn_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL DEFAULT 0,
      payment_type TEXT DEFAULT 'cash',
      paid_amount REAL DEFAULT 0,
      notes TEXT,
      txn_date TEXT NOT NULL,
      created_by INTEGER,
      created_by_role TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(shop_id) REFERENCES shops(id),
      FOREIGN KEY(item_id) REFERENCES inventory_items(id),
      FOREIGN KEY(customer_id) REFERENCES pet_customers(id)
    )`);

    db.run(`ALTER TABLE inventory_transactions ADD COLUMN customer_id INTEGER`, (err) => {});
    db.run(`ALTER TABLE inventory_transactions ADD COLUMN invoice_number TEXT`, (err) => {});
    db.run(`ALTER TABLE inventory_transactions ADD COLUMN payment_type TEXT DEFAULT 'cash'`, (err) => {});
    db.run(`ALTER TABLE inventory_transactions ADD COLUMN paid_amount REAL DEFAULT 0`, (err) => {});

    // Insert current Sight Ledger plans.
    db.run(`DELETE FROM plans`);
    db.run(`INSERT INTO plans (plan_name, duration_days, price, customer_limit, is_active) VALUES
      ('Free Trial', 7, 0, 100, 1),
      ('Plus', 30, 1000, 200, 1),
      ('Aqua Plus', 30, 1500, 300, 1),
      ('Aqua Premium', 30, 2500, 500, 1),
      ('Aqua Custom Plan', 30, 0, 999999, 1)`);

    // Insert Super Admin
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

    const createSuperAdmin = (email, passwordHash) => {
      db.run(`INSERT OR IGNORE INTO shops (shop_name, owner_name, phone, address, email, password, subscription_type, subscription_start, subscription_expiry, customer_limit, business_mode, default_refill_rate, is_active)
        VALUES ('Sight Ledger System', 'Super Admin', '0000000000', 'System Admin', ?, ?, 'super_admin', '2024-01-01', '2030-12-31', 999999, 'water_19l', 100, 1)`,
        [email, passwordHash]);
    };

    if (SUPERADMIN_EMAIL && SUPERADMIN_PASSWORD) {
      const hashedPassword = bcrypt.hashSync(SUPERADMIN_PASSWORD, 10);
      createSuperAdmin(SUPERADMIN_EMAIL, hashedPassword);
      db.run(`UPDATE shops
              SET password = ?, shop_name = 'Sight Ledger System', owner_name = 'Super Admin', business_mode = 'water_19l', is_active = 1
              WHERE email = ? AND subscription_type = 'super_admin'`,
        [hashedPassword, SUPERADMIN_EMAIL]);
    } else {
      db.get(`SELECT COUNT(*) as count FROM shops WHERE subscription_type = 'super_admin'`, (err, row) => {
        if (!err && Number(row?.count || 0) === 0) {
          const randomPasswordHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
          createSuperAdmin('admin@sightledger.local', randomPasswordHash);
        }
      });
    }

    console.log('Database tables initialized with Sight Ledger plans');

    // Lightweight migrations for older DBs (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
    db.all(`PRAGMA table_info(deliveries)`, (err, cols) => {
      if (err) return;
      const names = new Set((cols || []).map(c => c.name));
      if (!names.has('walkin_name')) {
        db.run(`ALTER TABLE deliveries ADD COLUMN walkin_name TEXT`);
      }
      if (!names.has('walkin_rate_per_bottle')) {
        db.run(`ALTER TABLE deliveries ADD COLUMN walkin_rate_per_bottle REAL`);
      }
    });

    db.all(`PRAGMA table_info(customers)`, (err, cols) => {
      if (err) return;
      const names = new Set((cols || []).map(c => c.name));
      if (!names.has('security_deposit_amount')) {
        db.run(`ALTER TABLE customers ADD COLUMN security_deposit_amount REAL DEFAULT 0`);
      }
    });

    // Fix legacy/badly-saved shop expiry dates where paid plans were accidentally set to 7 days.
    db.all(`SELECT id, subscription_type, subscription_start, subscription_expiry FROM shops WHERE subscription_type != 'super_admin'`, (shopsErr, shops) => {
      if (shopsErr || !shops?.length) return;
      db.all(`SELECT plan_name, duration_days FROM plans WHERE is_active = 1`, (plansErr, plans) => {
        if (plansErr || !plans?.length) return;

        const planMap = new Map(plans.map(p => [String(p.plan_name || '').toLowerCase(), Number(p.duration_days) || 0]));
        const normalize = (planName) => {
          const name = String(planName || '').toLowerCase().trim();
          if (name === 'monthly - 200') return 'plus';
          if (name === 'monthly - 300') return 'aqua plus';
          if (name === 'monthly - 600') return 'aqua premium';
          if (name === 'free_trial') return 'free trial';
          return name;
        };
        const dayDiff = (start, end) => {
          const s = new Date(start);
          const e = new Date(end);
          return Math.round((e - s) / (1000 * 60 * 60 * 24));
        };

        shops.forEach((shop) => {
          const key = normalize(shop.subscription_type);
          const expectedDuration = planMap.get(key);
          if (!expectedDuration || !shop.subscription_start || !shop.subscription_expiry) return;

          const currentDuration = dayDiff(shop.subscription_start, shop.subscription_expiry);
          const isClearlyWrongPaidPlan = expectedDuration > 7 && currentDuration <= 8;
          if (!isClearlyWrongPaidPlan) return;

          const fixedExpiryDate = new Date(shop.subscription_start);
          fixedExpiryDate.setDate(fixedExpiryDate.getDate() + expectedDuration);
          const fixedExpiry = fixedExpiryDate.toISOString().split('T')[0];

          db.run(`UPDATE shops SET subscription_expiry = ? WHERE id = ?`, [fixedExpiry, shop.id]);
        });
      });
    });
  });
}

module.exports = db;
