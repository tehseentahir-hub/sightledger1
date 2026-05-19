const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logAudit } = require('../utils/audit');

const systemShopFilter = `s.shop_name NOT IN ('AquaFlow System', 'Sight Ledger System') AND s.email != 'admin@aquaflow.com'`;
const systemShopFilterNoAlias = `shop_name NOT IN ('AquaFlow System', 'Sight Ledger System') AND email != 'admin@aquaflow.com'`;

const getAllShops = (req, res) => {
  db.all(`
    SELECT s.*, COUNT(c.id) as customer_count
    FROM shops s
    LEFT JOIN customers c ON s.id = c.shop_id
    WHERE ${systemShopFilter}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `, [], (err, shops) => {
    if (err) return res.status(500).json({ message: 'Error fetching shops', error: err.message });
    res.json(shops);
  });
};

const createShop = (req, res) => {
  const { shop_name, owner_name, phone, address, email, password, subscription_type, duration_days } = req.body;

  console.log('Creating shop:', { shop_name, subscription_type, email });

  // Validate required fields
  if (!shop_name || !owner_name || !phone || !email || !password) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }

  // Get plan details
  db.get('SELECT * FROM plans WHERE LOWER(plan_name) = LOWER(?)', [subscription_type], (err, plan) => {
    if (err) {
      console.log('Plan fetch error:', err);
      return res.status(500).json({ message: 'Error fetching plan' });
    }

    console.log('Plan found:', plan);

    const customerLimit = plan?.customer_limit || 100;
    const planDurationDays = Number(plan?.duration_days) > 0 ? Number(plan.duration_days) : (Number(duration_days) > 0 ? Number(duration_days) : 30);

    db.get('SELECT id FROM shops WHERE email = ?', [email], async (err, existing) => {
      if (err) {
        console.log('Email check error:', err);
        return res.status(500).json({ message: 'Error checking email' });
      }
      if (existing) return res.status(400).json({ message: 'Email already registered' });

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().split('T')[0];
        const expiryDate = new Date();
        // Always prefer duration from plan to avoid client-side stale/default duration bugs.
        expiryDate.setDate(expiryDate.getDate() + planDurationDays);
        const expiry = expiryDate.toISOString().split('T')[0];

        db.run(
          'INSERT INTO shops (shop_name, owner_name, phone, address, email, password, subscription_type, subscription_start, subscription_expiry, customer_limit, default_refill_rate, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [shop_name, owner_name, phone, address, email, hashedPassword, subscription_type, startDate, expiry, customerLimit, 100, 1],
          function(err) {
            if (err) {
              console.log('Insert error:', err);
              return res.status(500).json({ message: 'Error creating shop', error: err.message });
            }
            console.log('Shop created with ID:', this.lastID);
            db.run('INSERT INTO bottles_inventory (shop_id, total_bottles, bottles_with_customers, bottles_in_shop) VALUES (?, 50, 0, 50)', [this.lastID]);
            logAudit({
              shop_id: this.lastID,
              actor_id: req.user.id,
              actor_role: req.user.role || 'super_admin',
              action: 'create',
              entity_type: 'shop',
              entity_id: this.lastID,
              details: { shop_name, subscription_type, customerLimit, duration_days: planDurationDays },
            });
            res.status(201).json({ message: 'Shop created successfully', shop_id: this.lastID, duration_days: planDurationDays });
          }
        );
      } catch (hashErr) {
        console.log('Hash error:', hashErr);
        res.status(500).json({ message: 'Error hashing password' });
      }
    });
  });
};

const updateShop = (req, res) => {
  const { id } = req.params;
  const { shop_name, owner_name, phone, address, subscription_type, is_active, password } = req.body;

  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'UPDATE shops SET shop_name = ?, owner_name = ?, phone = ?, address = ?, subscription_type = ?, is_active = ?, password = ? WHERE id = ?',
      [shop_name, owner_name, phone, address, subscription_type, is_active ? 1 : 0, hashedPassword, id],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating shop', error: err.message });
        logAudit({
          shop_id: Number(id),
          actor_id: req.user.id,
          actor_role: req.user.role || 'super_admin',
          action: 'update',
          entity_type: 'shop',
          entity_id: Number(id),
          details: { shop_name, subscription_type, is_active: is_active ? 1 : 0, password_changed: true },
        });
        res.json({ message: 'Shop updated successfully' });
      }
    );
  } else {
    db.run(
      'UPDATE shops SET shop_name = ?, owner_name = ?, phone = ?, address = ?, subscription_type = ?, is_active = ? WHERE id = ?',
      [shop_name, owner_name, phone, address, subscription_type, is_active ? 1 : 0, id],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error updating shop', error: err.message });
        logAudit({
          shop_id: Number(id),
          actor_id: req.user.id,
          actor_role: req.user.role || 'super_admin',
          action: 'update',
          entity_type: 'shop',
          entity_id: Number(id),
          details: { shop_name, subscription_type, is_active: is_active ? 1 : 0, password_changed: false },
        });
        res.json({ message: 'Shop updated successfully' });
      }
    );
  }
};

const deleteShop = (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM shops WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ message: 'Error deleting shop', error: err.message });
    logAudit({
      shop_id: Number(id),
      actor_id: req.user.id,
      actor_role: req.user.role || 'super_admin',
      action: 'delete',
      entity_type: 'shop',
      entity_id: Number(id),
    });
    res.json({ message: 'Shop deleted successfully' });
  });
};

const getPlans = (req, res) => {
  db.all('SELECT * FROM plans WHERE is_active = 1', (err, plans) => {
    if (err) return res.status(500).json({ message: 'Error fetching plans', error: err.message });
    res.json(plans);
  });
};

const getAuditLogs = (req, res) => {
  const { shop_id, action, entity_type, start_date, end_date, page = 1, limit = 50 } = req.query;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;

  let where = 'WHERE 1=1';
  const params = [];

  if (shop_id) {
    where += ' AND a.shop_id = ?';
    params.push(Number(shop_id));
  }
  if (action) {
    where += ' AND a.action = ?';
    params.push(String(action));
  }
  if (entity_type) {
    where += ' AND a.entity_type = ?';
    params.push(String(entity_type));
  }
  if (start_date) {
    where += ' AND date(a.created_at) >= date(?)';
    params.push(String(start_date));
  }
  if (end_date) {
    where += ' AND date(a.created_at) <= date(?)';
    params.push(String(end_date));
  }

  const countQuery = `SELECT COUNT(*) as total FROM audit_logs a ${where}`;
  const dataQuery = `
    SELECT a.*, s.shop_name
    FROM audit_logs a
    LEFT JOIN shops s ON s.id = a.shop_id
    ${where}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `;

  db.get(countQuery, params, (countErr, countRow) => {
    if (countErr) return res.status(500).json({ message: 'Error fetching audit log count', error: countErr.message });

    db.all(dataQuery, [...params, safeLimit, offset], (dataErr, rows) => {
      if (dataErr) return res.status(500).json({ message: 'Error fetching audit logs', error: dataErr.message });

      const items = (rows || []).map((r) => ({
        ...r,
        details: (() => {
          try { return r.details ? JSON.parse(r.details) : null; } catch (_) { return r.details || null; }
        })(),
      }));

      res.json({
        items,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: countRow?.total || 0,
          total_pages: Math.ceil((countRow?.total || 0) / safeLimit) || 1,
        },
      });
    });
  });
};

const createPlan = (req, res) => {
  const { plan_name, duration_days, price, customer_limit } = req.body;
  db.run('INSERT INTO plans (plan_name, duration_days, price, customer_limit) VALUES (?, ?, ?, ?)', [plan_name, duration_days, price, customer_limit], function(err) {
    if (err) return res.status(500).json({ message: 'Error creating plan', error: err.message });
    res.status(201).json({ message: 'Plan created', plan_id: this.lastID });
  });
};

// Super Admin Dashboard - SaaS Metrics
const getDashboard = (req, res) => {
  // Basic counts
  db.get(`
    SELECT COUNT(*) as total_shops,
           SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_shops,
           SUM(CASE WHEN subscription_expiry < date('now') THEN 1 ELSE 0 END) as expired_shops
    FROM shops WHERE ${systemShopFilterNoAlias}
  `, [], (err, shopStats) => {
    // Total customers and deliveries
    db.get('SELECT COUNT(*) as total_customers FROM customers', [], (err, customers) => {
      db.get('SELECT COUNT(*) as total_deliveries FROM deliveries', [], (err, deliveries) => {
        // Shops by plan
        db.all(`
          SELECT subscription_type,
                 COUNT(*) as shop_count,
                 SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
                 SUM(CASE WHEN subscription_expiry < date('now') THEN 1 ELSE 0 END) as expired_count
          FROM shops WHERE ${systemShopFilterNoAlias}
          GROUP BY subscription_type
        `, [], (err, planStats) => {
          // Calculate monthly revenue potential
          db.all(`
            SELECT s.subscription_type, s.customer_limit
            FROM shops s
            WHERE ${systemShopFilter} AND s.is_active = 1 AND s.subscription_expiry >= date('now')
          `, [], (err, activeShops) => {

            // Get all plan prices for matching
            db.all('SELECT plan_name, price, customer_limit FROM plans', [], (err, plans) => {
              let monthlyRevenue = 0;
              activeShops.forEach(shop => {
                // Exact match or case-insensitive match with plan names
                const shopPlan = shop.subscription_type?.trim();
                const matchedPlan = plans.find(p =>
                  p.plan_name.toLowerCase() === shopPlan?.toLowerCase() ||
                  shopPlan?.toLowerCase() === p.plan_name.toLowerCase()
                );

                if (matchedPlan && matchedPlan.price > 0) {
                  monthlyRevenue += matchedPlan.price;
                }
              });

              db.all(`
                SELECT id, subscription_type, subscription_expiry, is_active
                FROM shops
                WHERE ${systemShopFilterNoAlias}
              `, [], (shopsErr, allShops) => {
                const now = new Date();
                const toDateOnly = (dateLike) => {
                  const d = new Date(dateLike);
                  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                };
                const diffDays = (d1, d2) => Math.ceil((toDateOnly(d1) - toDateOnly(d2)) / (1000 * 60 * 60 * 24));

                const normalize = (name) => String(name || '').trim().toLowerCase();
                const planPriceMap = new Map((plans || []).map((p) => [normalize(p.plan_name), Number(p.price || 0)]));

                const planPriceOfShop = (subscriptionType) => {
                  const key = normalize(subscriptionType);
                  return Number(planPriceMap.get(key) || 0);
                };

                const expiring7 = (allShops || []).filter((s) => {
                  const d = diffDays(s.subscription_expiry, now);
                  return s.is_active === 1 && d >= 0 && d <= 7;
                });

                const expiring30 = (allShops || []).filter((s) => {
                  const d = diffDays(s.subscription_expiry, now);
                  return s.is_active === 1 && d >= 0 && d <= 30;
                });

                const expired = (allShops || []).filter((s) => {
                  const d = diffDays(s.subscription_expiry, now);
                  return d < 0;
                });

                const renewalDueAmount = expired.reduce((sum, s) => sum + planPriceOfShop(s.subscription_type), 0);
                const renewalSoonAmount = expiring7.reduce((sum, s) => sum + planPriceOfShop(s.subscription_type), 0);

                // Recent shops
                db.all(`
                  SELECT shop_name, owner_name, subscription_type, subscription_expiry, created_at
                  FROM shops
                  WHERE ${systemShopFilterNoAlias}
                  ORDER BY created_at DESC
                  LIMIT 5
                `, [], (err, recentShops) => {

                  res.json({
                    // Basic stats
                    total_shops: shopStats.total_shops || 0,
                    active_shops: shopStats.active_shops || 0,
                    expired_shops: shopStats.expired_shops || 0,
                    total_customers: customers.total_customers || 0,
                    total_deliveries: deliveries.total_deliveries || 0,

                    // Plan distribution
                    plan_stats: planStats || [],

                    // Revenue
                    monthly_revenue: monthlyRevenue,
                    active_shops_list: activeShops.length,
                    renewal_due_amount: renewalDueAmount,
                    renewal_soon_amount: renewalSoonAmount,

                    // Renewals
                    expiring_7_days: expiring7.length,
                    expiring_30_days: expiring30.length,

                    // Recent
                    recent_shops: recentShops || []
                  });
                });
              });
            }); // Close plans db.all
          });
        });
      });
    });
  });
};

module.exports = { getAllShops, createShop, updateShop, deleteShop, getPlans, createPlan, getDashboard, getAuditLogs };
