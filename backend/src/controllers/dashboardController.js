const db = require('../config/db');

const PK_TIMEZONE = 'Asia/Karachi';
const toPkDateText = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
const addDays = (dateText, days) => {
  const [y, m, d] = String(dateText).split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return toPkDateText(date);
};

const pGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const pAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const WITH_CUSTOMERS_TOTAL_SQL = `SELECT COALESCE(SUM(bottles_outside), 0) as with_customers
  FROM (
    SELECT
      CASE
        WHEN COALESCE(SUM(d.bottles_delivered - d.bottles_returned), 0) > 0
        THEN COALESCE(SUM(d.bottles_delivered - d.bottles_returned), 0)
        ELSE 0
      END as bottles_outside
    FROM customers c
    LEFT JOIN deliveries d
      ON d.customer_id = c.id
     AND d.shop_id = c.shop_id
     AND d.delivery_type != 'walk_in'
    WHERE c.shop_id = ?
    GROUP BY c.id
  ) customer_bottles`;
const BOTTLES_OUTSIDE_TOTAL_SQL = WITH_CUSTOMERS_TOTAL_SQL.replace('as with_customers', 'as outstanding');

const getDashboard = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const today = toPkDateText();
    const last7Start = addDays(today, -6);
    const monthStart = `${today.slice(0, 8)}01`;

    const buildDateSeries = (start, end) => {
      const series = [];
      let cursor = String(start);
      const final = String(end);
      while (cursor <= final) {
        series.push(cursor);
        cursor = addDays(cursor, 1);
      }
      return series;
    };

    // Walk-in deliveries are identified only by delivery_type to avoid real customer ID collisions.
    // We'll track BOTH the count AND the bottles refilled for walk-ins

    const [todayDeliveries, todayStats, last7Stats, monthStats, activeCustomers, pendingPayments, advanceBalance, todayCollection, todayWalkinCash, bottlesOutstanding, monthlySales, recentDeliveries, walkinTrendRows] =
      await Promise.all([
        pGet(
          'SELECT COUNT(*) as count, COALESCE(SUM(bottles_delivered), 0) as bottles FROM deliveries WHERE shop_id = ? AND delivery_date = ?',
          [shop_id, today]
        ),
        pGet(
          `SELECT COUNT(*) AS count,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN bottles_delivered ELSE 0 END), 0) AS walkin_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN 1 ELSE 0 END), 0) AS walkins,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN bottles_delivered ELSE 0 END), 0) AS home_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN 1 ELSE 0 END), 0) AS homes
             FROM deliveries
            WHERE shop_id = ? AND delivery_date = ?`,
          [shop_id, today]
        ),
        pGet(
          `SELECT COUNT(*) AS count,
                  COALESCE(SUM(bottles_delivered), 0) AS bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN bottles_delivered ELSE 0 END), 0) AS walkin_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN 1 ELSE 0 END), 0) AS walkins,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN bottles_delivered ELSE 0 END), 0) AS home_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN 1 ELSE 0 END), 0) AS homes
             FROM deliveries
            WHERE shop_id = ? AND delivery_date BETWEEN ? AND ?`,
          [shop_id, last7Start, today]
        ),
        pGet(
          `SELECT COUNT(*) AS count,
                  COALESCE(SUM(bottles_delivered), 0) AS bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN bottles_delivered ELSE 0 END), 0) AS walkin_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'walk_in' THEN 1 ELSE 0 END), 0) AS walkins,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN bottles_delivered ELSE 0 END), 0) AS home_bottles,
                  COALESCE(SUM(CASE WHEN delivery_type = 'home_delivery' THEN 1 ELSE 0 END), 0) AS homes
             FROM deliveries
            WHERE shop_id = ? AND delivery_date BETWEEN ? AND ?`,
          [shop_id, monthStart, today]
        ),
        pGet('SELECT COUNT(*) as count FROM customers WHERE shop_id = ? AND is_active = 1', [shop_id]),
        pGet(
          `SELECT COALESCE(SUM(
                    CASE
                      WHEN (COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0)) > 0
                      THEN (COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0))
                      ELSE 0
                    END
                  ), 0) AS pending
             FROM customers c
             LEFT JOIN (
               SELECT d.customer_id, SUM(d.bottles_delivered * c2.rate_per_bottle) AS total_billed
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
            WHERE c.shop_id = ?`,
          [shop_id, shop_id, shop_id]
        ),
        pGet(
          `SELECT COALESCE(SUM(
                    CASE
                      WHEN (COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0)) < 0
                      THEN ABS(COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0))
                      ELSE 0
                    END
                  ), 0) AS advance
             FROM customers c
             LEFT JOIN (
               SELECT d.customer_id, SUM(d.bottles_delivered * c2.rate_per_bottle) AS total_billed
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
            WHERE c.shop_id = ?`,
          [shop_id, shop_id, shop_id]
        ),
        pGet(
          'SELECT COALESCE(SUM(amount), 0) as today_collection FROM payments WHERE shop_id = ? AND payment_date = ?',
          [shop_id, today]
        ),
        pGet(
          `SELECT COALESCE(SUM(bottles_delivered * COALESCE(walkin_rate_per_bottle, 0)), 0) as walkin_cash
             FROM deliveries
            WHERE shop_id = ? AND delivery_date = ? AND (delivery_type = 'walk_in')`,
          [shop_id, today]
        ),
        pGet(BOTTLES_OUTSIDE_TOTAL_SQL, [shop_id]),
        pGet(
          `SELECT COALESCE(SUM(
                    CASE
                      WHEN d.delivery_type = 'walk_in'
                      THEN (d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0))
                      ELSE (d.bottles_delivered * COALESCE(c.rate_per_bottle, 0))
                    END
                  ), 0) as sales
             FROM deliveries d
             LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
            WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?`,
          [shop_id, monthStart, today]
        ),
        pAll(
          `SELECT d.*, COALESCE(c.name, d.walkin_name, 'Walk-in') as customer_name, s.name as rider_name
             FROM deliveries d
             LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
             LEFT JOIN staff s ON d.rider_id = s.id
            WHERE d.shop_id = ?
            ORDER BY d.created_at DESC
            LIMIT 10`,
          [shop_id]
        ),
        pAll(
          `SELECT
             d.delivery_date,
             COUNT(*) AS total_deliveries,
             COALESCE(SUM(CASE WHEN d.delivery_type = 'walk_in' THEN 1 ELSE 0 END), 0) AS walkins,
             COALESCE(SUM(CASE WHEN d.delivery_type = 'walk_in' THEN d.bottles_delivered ELSE 0 END), 0) AS walkin_bottles,
             COALESCE(SUM(CASE WHEN d.delivery_type = 'home_delivery' THEN 1 ELSE 0 END), 0) AS homes,
             COALESCE(SUM(CASE WHEN d.delivery_type = 'home_delivery' THEN d.bottles_delivered ELSE 0 END), 0) AS home_bottles,
             COALESCE(SUM(d.bottles_delivered), 0) AS bottles,
             COALESCE(SUM(
               CASE
                 WHEN d.delivery_type = 'walk_in'
                 THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0)
                 ELSE d.bottles_delivered * COALESCE(c.rate_per_bottle, 0)
               END
             ), 0) AS sales
           FROM deliveries d
           LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
          WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?
          GROUP BY d.delivery_date
          ORDER BY d.delivery_date ASC`,
          [shop_id, last7Start, today]
        ),
      ]);

    const walkinTrendMap = new Map((walkinTrendRows || []).map((row) => [row.delivery_date, row]));
    const walkinTrend = buildDateSeries(last7Start, today).map((day) => ({
      date: day,
      total_deliveries: Number(walkinTrendMap.get(day)?.total_deliveries || 0),
      walkins: Number(walkinTrendMap.get(day)?.walkins || 0),
      walkin_bottles: Number(walkinTrendMap.get(day)?.walkin_bottles || 0),
      homes: Number(walkinTrendMap.get(day)?.homes || 0),
      home_bottles: Number(walkinTrendMap.get(day)?.home_bottles || 0),
      bottles: Number(walkinTrendMap.get(day)?.bottles || 0),
      sales: Number(walkinTrendMap.get(day)?.sales || 0),
    }));

    res.json({
      today_deliveries: todayDeliveries?.count || 0,
      today_bottles: todayDeliveries?.bottles || 0,
      today_walkins: todayStats?.walkins || 0,
      today_walkin_bottles: todayStats?.walkin_bottles || 0,
      today_homes: todayStats?.homes || 0,
      today_home_bottles: todayStats?.home_bottles || 0,
      active_customers: activeCustomers?.count || 0,
      pending_payments: pendingPayments?.pending || 0,
      advance_balance: advanceBalance?.advance || 0,
      today_collection: Number(todayCollection?.today_collection || 0) + Number(todayWalkinCash?.walkin_cash || 0),
      bottles_outside: bottlesOutstanding?.outstanding || 0,
      monthly_sales: monthlySales?.sales || 0,
      last7_deliveries: last7Stats?.count || 0,
      last7_bottles: last7Stats?.bottles || 0,
      last7_walkins: last7Stats?.walkins || 0,
      last7_walkin_bottles: last7Stats?.walkin_bottles || 0,
      last7_homes: last7Stats?.homes || 0,
      last7_home_bottles: last7Stats?.home_bottles || 0,
      month_deliveries: monthStats?.count || 0,
      month_bottles: monthStats?.bottles || 0,
      month_walkins: monthStats?.walkins || 0,
      month_walkin_bottles: monthStats?.walkin_bottles || 0,
      month_homes: monthStats?.homes || 0,
      month_home_bottles: monthStats?.home_bottles || 0,
      recent_deliveries: recentDeliveries,
      walkin_trend: walkinTrend,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading dashboard', error: err.message });
  }
};

const getReports = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const { type, start_date, end_date } = req.query;

    if (type === 'daily') {
      const report = await pAll(
        `SELECT d.delivery_date,
                COALESCE(c.name, d.walkin_name, 'Walk-in') as customer_name,
                d.bottles_delivered,
                d.bottles_returned,
                CASE
                  WHEN d.delivery_type = 'walk_in'
                  THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0)
                  ELSE d.bottles_delivered * COALESCE(c.rate_per_bottle, 0)
                END as amount,
                d.delivery_type,
                s.name as rider_name
           FROM deliveries d
           LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
           LEFT JOIN staff s ON d.rider_id = s.id
          WHERE d.shop_id = ? AND d.delivery_date = ?`,
        [shop_id, start_date]
      );

      const summary = {
        total_customers: report.length,
        total_bottles: report.reduce((s, r) => s + Number(r.bottles_delivered || 0), 0),
        total_amount: report.reduce((s, r) => s + Number(r.amount || 0), 0),
        home_deliveries: report.filter(r => r.delivery_type === 'home_delivery').length,
        walkin_deliveries: report.filter(r => r.delivery_type === 'walk_in').length
      };

      return res.json({ report, summary });
    }

    if (type === 'monthly') {
      const trend = await pAll(
        `SELECT d.delivery_date as day,
                COUNT(*) as total_deliveries,
                COUNT(DISTINCT CASE WHEN d.delivery_type = 'home_delivery' THEN d.customer_id END) as customers_served,
                SUM(d.bottles_delivered) as total_bottles,
                SUM(CASE WHEN d.delivery_type = 'walk_in' THEN 1 ELSE 0 END) as walkin_deliveries,
                SUM(CASE WHEN d.delivery_type = 'walk_in' THEN d.bottles_delivered ELSE 0 END) as walkin_bottles,
                SUM(CASE WHEN d.delivery_type = 'home_delivery' THEN 1 ELSE 0 END) as home_deliveries,
                SUM(CASE WHEN d.delivery_type = 'home_delivery' THEN d.bottles_delivered ELSE 0 END) as home_bottles,
                SUM(
                  CASE
                    WHEN d.delivery_type = 'walk_in'
                    THEN (d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0))
                    ELSE (d.bottles_delivered * COALESCE(c.rate_per_bottle, 0))
                  END
                ) as total_sales
           FROM deliveries d
           LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
          WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?
          GROUP BY d.delivery_date
          ORDER BY day ASC`,
        [shop_id, start_date, end_date]
      );

      const summary = {
        total_deliveries: trend.reduce((sum, row) => sum + Number(row.total_deliveries || 0), 0),
        total_bottles: trend.reduce((sum, row) => sum + Number(row.total_bottles || 0), 0),
        total_sales: trend.reduce((sum, row) => sum + Number(row.total_sales || 0), 0),
        walkin_deliveries: trend.reduce((sum, row) => sum + Number(row.walkin_deliveries || 0), 0),
        walkin_bottles: trend.reduce((sum, row) => sum + Number(row.walkin_bottles || 0), 0),
        home_deliveries: trend.reduce((sum, row) => sum + Number(row.home_deliveries || 0), 0),
        home_bottles: trend.reduce((sum, row) => sum + Number(row.home_bottles || 0), 0),
      };

      return res.json({ report: trend, summary, trend });
    }

    if (type === 'outstanding') {
      const report = await pAll(
        `SELECT
           c.id,
           c.name,
           c.phone,
           c.address,
           COALESCE(b.total_billed, 0) AS total_billed,
           COALESCE(p.total_paid, 0) AS total_paid,
           (COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0)) AS outstanding,
           COALESCE(b.delivery_count, 0) AS delivery_count
         FROM customers c
         LEFT JOIN (
           SELECT d.customer_id, SUM(d.bottles_delivered * c2.rate_per_bottle) AS total_billed, COUNT(d.id) AS delivery_count
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
           AND (COALESCE(b.total_billed, 0) - COALESCE(p.total_paid, 0)) > 0
         ORDER BY outstanding DESC`,
        [shop_id, shop_id, shop_id]
      );

      return res.json({ report });
    }

    if (type === 'bottles') {
      const inventoryRow = await pGet('SELECT * FROM bottles_inventory WHERE shop_id = ?', [shop_id]);
      const withCustomersRow = await pGet(WITH_CUSTOMERS_TOTAL_SQL, [shop_id]);
      const circulation = await pGet(
        `SELECT
           SUM(bottles_delivered) as total_delivered,
           SUM(bottles_returned) as total_returned,
           SUM(CASE WHEN delivery_type = 'walk_in' THEN 1 ELSE 0 END) as walkin_deliveries,
           SUM(CASE WHEN delivery_type = 'home_delivery' THEN 1 ELSE 0 END) as home_deliveries
         FROM deliveries
         WHERE shop_id = ? AND delivery_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date]
      );

      const totalBottles = Number(inventoryRow?.total_bottles || 0);
      const lostDamaged = Number(inventoryRow?.lost_damaged || 0);
      const withCustomers = Number(withCustomersRow?.with_customers || 0);
      const bottlesInShop = Math.max(0, totalBottles - lostDamaged - withCustomers);
      const inventory = {
        ...(inventoryRow || {}),
        total_bottles: totalBottles,
        lost_damaged: lostDamaged,
        bottles_with_customers: withCustomers,
        bottles_in_shop: bottlesInShop,
      };

      return res.json({ inventory: inventory || {}, circulation: circulation || {} });
    }

    if (type === 'profit') {
      const income = await pGet(
        `SELECT COALESCE(SUM(
                  CASE
                    WHEN d.delivery_type = 'walk_in'
                    THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0)
                    ELSE d.bottles_delivered * COALESCE(c.rate_per_bottle, 0)
                  END
                ), 0) as income
           FROM deliveries d
           LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
          WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date]
      );

      const incomeBreakdown = await pGet(
        `SELECT
           COALESCE(SUM(CASE WHEN d.delivery_type = 'walk_in' THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0) ELSE 0 END), 0) as walkin_income,
           COALESCE(SUM(CASE WHEN d.delivery_type = 'home_delivery' THEN d.bottles_delivered * COALESCE(c.rate_per_bottle, 0) ELSE 0 END), 0) as home_income
         FROM deliveries d
         LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
         WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date]
      );

      const expenses = await pGet(
        `SELECT COALESCE(SUM(amount), 0) as expenses
           FROM expenses
          WHERE shop_id = ? AND expense_date BETWEEN ? AND ?`,
        [shop_id, start_date, end_date]
      );

      const expenseBreakdown = await pAll(
        `SELECT expense_type, COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE shop_id = ? AND expense_date BETWEEN ? AND ?
         GROUP BY expense_type
         ORDER BY total DESC`,
        [shop_id, start_date, end_date]
      );

      const daily = await pAll(
        `SELECT day,
                COALESCE(SUM(income), 0) as income,
                COALESCE(SUM(expense), 0) as expenses,
                COALESCE(SUM(income), 0) - COALESCE(SUM(expense), 0) as profit
         FROM (
           SELECT d.delivery_date as day,
                  CASE
                    WHEN d.delivery_type = 'walk_in'
                    THEN d.bottles_delivered * COALESCE(d.walkin_rate_per_bottle, 0)
                    ELSE d.bottles_delivered * COALESCE(c.rate_per_bottle, 0)
                  END as income,
                  0 as expense
           FROM deliveries d
           LEFT JOIN customers c ON d.customer_id = c.id AND d.delivery_type != 'walk_in'
           WHERE d.shop_id = ? AND d.delivery_date BETWEEN ? AND ?
           UNION ALL
           SELECT expense_date as day, 0 as income, amount as expense
           FROM expenses
           WHERE shop_id = ? AND expense_date BETWEEN ? AND ?
         )
         GROUP BY day
         ORDER BY day ASC`,
        [shop_id, start_date, end_date, shop_id, start_date, end_date]
      );

      const profit = (income?.income || 0) - (expenses?.expenses || 0);
      return res.json({
        income: income?.income || 0,
        expenses: expenses?.expenses || 0,
        profit,
        income_breakdown: incomeBreakdown || { walkin_income: 0, home_income: 0 },
        expense_breakdown: expenseBreakdown || [],
        daily: daily || []
      });
    }

    return res.status(400).json({ message: 'Invalid report type' });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
};

module.exports = { getDashboard, getReports };
