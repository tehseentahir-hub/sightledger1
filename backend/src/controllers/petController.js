const db = require('../config/db');
const {
  BUSINESS_MODES,
  hasPetInventoryMode,
  isRestrictedPetCashier,
  normalizeBusinessMode,
} = require('../utils/businessMode');

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

const pRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

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

const STOCK_TOTAL_SQL = `
  SELECT
    i.id,
    i.shop_id,
    i.item_name,
    i.category,
    i.size_label,
    i.unit_type,
    i.cost_price,
    i.sale_price,
    i.opening_stock,
    i.is_active,
    i.created_at,
    (
      COALESCE(i.opening_stock, 0) +
      COALESCE(SUM(
        CASE
          WHEN t.txn_type IN ('stock_in', 'return_in', 'adjustment_in') THEN t.quantity
          WHEN t.txn_type IN ('sale', 'damage', 'adjustment_out') THEN -t.quantity
          ELSE 0
        END
      ), 0)
    ) as current_stock
  FROM inventory_items i
  LEFT JOIN inventory_transactions t
    ON t.item_id = i.id
   AND t.shop_id = i.shop_id
`;

const getShopOrThrow = async (shopId) => {
  const shop = await pGet('SELECT id, shop_name, business_mode FROM shops WHERE id = ?', [shopId]);
  if (!shop) {
    const error = new Error('Shop not found');
    error.statusCode = 404;
    throw error;
  }
  if (!hasPetInventoryMode(shop)) {
    const error = new Error('This shop is not enabled for PET inventory mode');
    error.statusCode = 403;
    throw error;
  }
  return { ...shop, business_mode: normalizeBusinessMode(shop.business_mode) };
};

const getItems = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const shop = await getShopOrThrow(shop_id);
    const hideAmounts = isRestrictedPetCashier(req.user, shop);

    const items = await pAll(
      `${STOCK_TOTAL_SQL}
       WHERE i.shop_id = ?
       GROUP BY i.id
       ORDER BY i.is_active DESC, i.item_name ASC, i.size_label ASC`,
      [shop_id]
    );

    res.json(items.map((item) => ({
      ...item,
      current_stock: Number(item.current_stock || 0),
      opening_stock: Number(item.opening_stock || 0),
      cost_price: hideAmounts ? null : Number(item.cost_price || 0),
      sale_price: hideAmounts ? null : Number(item.sale_price || 0),
      is_active: Boolean(item.is_active),
    })));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching PET items' });
  }
};

const createItem = async (req, res) => {
  try {
    const { shop_id, id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can manage PET inventory items' });
    }

    await getShopOrThrow(shop_id);

    const {
      item_name,
      category,
      size_label,
      unit_type,
      cost_price,
      sale_price,
      opening_stock,
      is_active,
    } = req.body;

    if (!String(item_name || '').trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    if (!String(size_label || '').trim()) {
      return res.status(400).json({ message: 'Size label is required' });
    }

    const result = await pRun(
      `INSERT INTO inventory_items
        (shop_id, item_name, category, size_label, unit_type, cost_price, sale_price, opening_stock, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        String(item_name).trim(),
        String(category || 'PET Bottle').trim(),
        String(size_label).trim(),
        String(unit_type || 'pieces').trim(),
        Number(cost_price || 0),
        Number(sale_price || 0),
        Math.max(0, Number(opening_stock || 0)),
        is_active === false ? 0 : 1,
        id,
      ]
    );

    res.status(201).json({ message: 'Item created successfully', item_id: result.lastID });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating item' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { shop_id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can manage PET inventory items' });
    }
    await getShopOrThrow(shop_id);

    const { id } = req.params;
    const {
      item_name,
      category,
      size_label,
      unit_type,
      cost_price,
      sale_price,
      opening_stock,
      is_active,
    } = req.body;

    const existing = await pGet('SELECT id FROM inventory_items WHERE id = ? AND shop_id = ?', [id, shop_id]);
    if (!existing) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!String(item_name || '').trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    if (!String(size_label || '').trim()) {
      return res.status(400).json({ message: 'Size label is required' });
    }

    await pRun(
      `UPDATE inventory_items
          SET item_name = ?,
              category = ?,
              size_label = ?,
              unit_type = ?,
              cost_price = ?,
              sale_price = ?,
              opening_stock = ?,
              is_active = ?
        WHERE id = ? AND shop_id = ?`,
      [
        String(item_name).trim(),
        String(category || 'PET Bottle').trim(),
        String(size_label).trim(),
        String(unit_type || 'pieces').trim(),
        Number(cost_price || 0),
        Number(sale_price || 0),
        Math.max(0, Number(opening_stock || 0)),
        is_active === false ? 0 : 1,
        id,
        shop_id,
      ]
    );

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error updating item' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { shop_id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can remove items' });
    }

    await getShopOrThrow(shop_id);

    const { id } = req.params;
    await pRun('UPDATE inventory_items SET is_active = 0 WHERE id = ? AND shop_id = ?', [id, shop_id]);
    res.json({ message: 'Item archived successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error deleting item' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);

    const { start_date, end_date, item_id, txn_type } = req.query;
    let sql = `
      SELECT t.*, i.item_name, i.size_label, i.unit_type
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
      WHERE t.shop_id = ?
    `;
    const params = [shop_id];

    if (start_date) {
      sql += ' AND t.txn_date >= ?';
      params.push(String(start_date));
    }
    if (end_date) {
      sql += ' AND t.txn_date <= ?';
      params.push(String(end_date));
    }
    if (item_id) {
      sql += ' AND t.item_id = ?';
      params.push(Number(item_id));
    }
    if (txn_type) {
      sql += ' AND t.txn_type = ?';
      params.push(String(txn_type));
    }

    sql += ' ORDER BY t.txn_date DESC, t.id DESC LIMIT 200';

    const shop = await getShopOrThrow(shop_id);
    const hideAmounts = isRestrictedPetCashier(req.user, shop);
    const rows = await pAll(sql, params);

    res.json(rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_price: hideAmounts ? null : Number(row.unit_price || 0),
    })));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching transactions' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { shop_id, id, role, type } = req.user;
    await getShopOrThrow(shop_id);

    if (type === 'staff' && role !== 'cashier') {
      return res.status(403).json({ message: 'Only shop owner or cashier can add PET entries' });
    }

    const { item_id, txn_type, quantity, unit_price, notes, txn_date } = req.body;
    const normalizedType = String(txn_type || '').trim();
    const allowedTypes = ['stock_in', 'sale', 'damage', 'return_in', 'adjustment_in', 'adjustment_out'];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: 'Valid transaction type is required' });
    }

    const qty = Number(quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }

    const item = await pGet('SELECT * FROM inventory_items WHERE id = ? AND shop_id = ? AND is_active = 1', [item_id, shop_id]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const stockRow = await pGet(
      `${STOCK_TOTAL_SQL}
       WHERE i.shop_id = ? AND i.id = ?
       GROUP BY i.id`,
      [shop_id, Number(item_id)]
    );

    const currentStock = Number(stockRow?.current_stock || 0);
    const reducesStock = ['sale', 'damage', 'adjustment_out'].includes(normalizedType);
    if (reducesStock && qty > currentStock) {
      return res.status(400).json({ message: `Only ${currentStock} units are available for this item.` });
    }

    const effectivePrice = Number(
      typeof unit_price !== 'undefined' && unit_price !== ''
        ? unit_price
        : normalizedType === 'sale'
          ? item.sale_price
          : item.cost_price
    );

    const result = await pRun(
      `INSERT INTO inventory_transactions
        (shop_id, item_id, txn_type, quantity, unit_price, notes, txn_date, created_by, created_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        Number(item_id),
        normalizedType,
        qty,
        Number.isFinite(effectivePrice) ? effectivePrice : 0,
        String(notes || '').trim(),
        String(txn_date || toPkDateText()),
        id,
        role,
      ]
    );

    res.status(201).json({ message: 'Entry saved successfully', transaction_id: result.lastID });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error saving transaction' });
  }
};

const getSummary = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const shop = await getShopOrThrow(shop_id);
    const today = toPkDateText();
    const weekStart = addDays(today, -6);
    const monthStart = `${today.slice(0, 8)}01`;
    const hideAmounts = isRestrictedPetCashier(req.user, shop);

    const [items, stockTotals, todaySales, weekSales, monthSales, lowStock, recentTransactions, trendRows] = await Promise.all([
      pAll(
        `${STOCK_TOTAL_SQL}
         WHERE i.shop_id = ? AND i.is_active = 1
         GROUP BY i.id
         ORDER BY i.item_name ASC, i.size_label ASC`,
        [shop_id]
      ),
      pGet(
        `SELECT
           COUNT(*) as total_skus,
           COALESCE(SUM(current_stock), 0) as current_stock
         FROM (
           ${STOCK_TOTAL_SQL}
           WHERE i.shop_id = ? AND i.is_active = 1
           GROUP BY i.id
         ) summary_rows`,
        [shop_id]
      ),
      pGet(
        `SELECT
           COALESCE(SUM(quantity), 0) as qty,
           COALESCE(SUM(quantity * unit_price), 0) as amount
         FROM inventory_transactions
         WHERE shop_id = ? AND txn_type = 'sale' AND txn_date = ?`,
        [shop_id, today]
      ),
      pGet(
        `SELECT
           COALESCE(SUM(quantity), 0) as qty,
           COALESCE(SUM(quantity * unit_price), 0) as amount
         FROM inventory_transactions
         WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?`,
        [shop_id, weekStart, today]
      ),
      pGet(
        `SELECT
           COALESCE(SUM(quantity), 0) as qty,
           COALESCE(SUM(quantity * unit_price), 0) as amount
         FROM inventory_transactions
         WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?`,
        [shop_id, monthStart, today]
      ),
      pAll(
        `SELECT * FROM (
           ${STOCK_TOTAL_SQL}
           WHERE i.shop_id = ? AND i.is_active = 1
           GROUP BY i.id
         ) stock_rows
         WHERE current_stock <= 20
         ORDER BY current_stock ASC, item_name ASC
         LIMIT 8`,
        [shop_id]
      ),
      pAll(
        `SELECT t.*, i.item_name, i.size_label, i.unit_type
           FROM inventory_transactions t
           JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
          WHERE t.shop_id = ?
          ORDER BY t.txn_date DESC, t.id DESC
          LIMIT 10`,
        [shop_id]
      ),
      pAll(
        `SELECT txn_date,
                COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity ELSE 0 END), 0) as sales_qty,
                COALESCE(SUM(CASE WHEN txn_type = 'stock_in' THEN quantity ELSE 0 END), 0) as stock_in_qty
           FROM inventory_transactions
          WHERE shop_id = ? AND txn_date BETWEEN ? AND ?
          GROUP BY txn_date
          ORDER BY txn_date ASC`,
        [shop_id, weekStart, today]
      ),
    ]);

    res.json({
      business_mode: normalizeBusinessMode(shop.business_mode),
      total_skus: Number(stockTotals?.total_skus || 0),
      current_stock: Number(stockTotals?.current_stock || 0),
      today_sales_qty: Number(todaySales?.qty || 0),
      week_sales_qty: Number(weekSales?.qty || 0),
      month_sales_qty: Number(monthSales?.qty || 0),
      today_sales_amount: hideAmounts ? null : Number(todaySales?.amount || 0),
      week_sales_amount: hideAmounts ? null : Number(weekSales?.amount || 0),
      month_sales_amount: hideAmounts ? null : Number(monthSales?.amount || 0),
      low_stock_count: lowStock.length,
      low_stock_items: lowStock.map((row) => ({ ...row, current_stock: Number(row.current_stock || 0) })),
      items: items.map((row) => ({
        ...row,
        current_stock: Number(row.current_stock || 0),
        cost_price: hideAmounts ? null : Number(row.cost_price || 0),
        sale_price: hideAmounts ? null : Number(row.sale_price || 0),
      })),
      recent_transactions: recentTransactions.map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unit_price: hideAmounts ? null : Number(row.unit_price || 0),
      })),
      trend: trendRows.map((row) => ({
        ...row,
        sales_qty: Number(row.sales_qty || 0),
        stock_in_qty: Number(row.stock_in_qty || 0),
      })),
      financials_hidden: hideAmounts,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error loading PET dashboard' });
  }
};

const getReports = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const shop = await getShopOrThrow(shop_id);
    const { start_date = addDays(toPkDateText(), -6), end_date = toPkDateText() } = req.query;
    const hideAmounts = isRestrictedPetCashier(req.user, shop);

    const [itemSummary, dailyTrend, lowStock, recentSales] = await Promise.all([
      pAll(
        `SELECT
           i.id,
           i.item_name,
           i.size_label,
           i.unit_type,
           i.sale_price,
           i.cost_price,
           (
             COALESCE(i.opening_stock, 0) +
             COALESCE(SUM(
               CASE
                 WHEN t.txn_type IN ('stock_in', 'return_in', 'adjustment_in') THEN t.quantity
                 WHEN t.txn_type IN ('sale', 'damage', 'adjustment_out') THEN -t.quantity
                 ELSE 0
               END
             ), 0)
           ) as current_stock,
           COALESCE(SUM(CASE WHEN t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ? THEN t.quantity ELSE 0 END), 0) as sold_qty,
           COALESCE(SUM(CASE WHEN t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ? THEN t.quantity * t.unit_price ELSE 0 END), 0) as sold_amount
         FROM inventory_items i
         LEFT JOIN inventory_transactions t
           ON t.item_id = i.id
          AND t.shop_id = i.shop_id
         WHERE i.shop_id = ? AND i.is_active = 1
         GROUP BY i.id
         ORDER BY sold_qty DESC, i.item_name ASC`,
        [start_date, end_date, start_date, end_date, shop_id]
      ),
      pAll(
        `SELECT
           txn_date,
           COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity ELSE 0 END), 0) as sales_qty,
           COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity * unit_price ELSE 0 END), 0) as sales_amount,
           COALESCE(SUM(CASE WHEN txn_type = 'stock_in' THEN quantity ELSE 0 END), 0) as stock_in_qty
         FROM inventory_transactions
         WHERE shop_id = ? AND txn_date BETWEEN ? AND ?
         GROUP BY txn_date
         ORDER BY txn_date ASC`,
        [shop_id, start_date, end_date]
      ),
      pAll(
        `SELECT * FROM (
           ${STOCK_TOTAL_SQL}
           WHERE i.shop_id = ? AND i.is_active = 1
           GROUP BY i.id
         ) stock_rows
         WHERE current_stock <= 20
         ORDER BY current_stock ASC, item_name ASC`,
        [shop_id]
      ),
      pAll(
        `SELECT t.*, i.item_name, i.size_label, i.unit_type
           FROM inventory_transactions t
           JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
          WHERE t.shop_id = ? AND t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ?
          ORDER BY t.txn_date DESC, t.id DESC
          LIMIT 50`,
        [shop_id, start_date, end_date]
      ),
    ]);

    const totalSoldQty = itemSummary.reduce((sum, row) => sum + Number(row.sold_qty || 0), 0);
    const totalSoldAmount = itemSummary.reduce((sum, row) => sum + Number(row.sold_amount || 0), 0);

    res.json({
      business_mode: normalizeBusinessMode(shop.business_mode),
      summary: {
        total_skus: itemSummary.length,
        total_sold_qty: totalSoldQty,
        total_sold_amount: hideAmounts ? null : totalSoldAmount,
        low_stock_count: lowStock.length,
      },
      item_summary: itemSummary.map((row) => ({
        ...row,
        current_stock: Number(row.current_stock || 0),
        sold_qty: Number(row.sold_qty || 0),
        sold_amount: hideAmounts ? null : Number(row.sold_amount || 0),
        sale_price: hideAmounts ? null : Number(row.sale_price || 0),
        cost_price: hideAmounts ? null : Number(row.cost_price || 0),
      })),
      daily_trend: dailyTrend.map((row) => ({
        ...row,
        sales_qty: Number(row.sales_qty || 0),
        sales_amount: hideAmounts ? null : Number(row.sales_amount || 0),
        stock_in_qty: Number(row.stock_in_qty || 0),
      })),
      low_stock: lowStock.map((row) => ({
        ...row,
        current_stock: Number(row.current_stock || 0),
      })),
      recent_sales: recentSales.map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unit_price: hideAmounts ? null : Number(row.unit_price || 0),
      })),
      financials_hidden: hideAmounts,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error loading PET reports' });
  }
};

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getTransactions,
  createTransaction,
  getSummary,
  getReports,
};
