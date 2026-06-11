const db = require('../config/db');
const {
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
    COALESCE(i.min_stock_alert, 20) as min_stock_alert,
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

const PET_BALANCE_SUBQUERY = `
  SELECT
    c.id,
    c.name,
    c.phone,
    c.address,
    c.customer_type,
    c.is_active,
    c.created_at,
    COALESCE(s.total_purchase, 0) as total_purchase,
    COALESCE(s.sale_paid, 0) + COALESCE(p.extra_paid, 0) as total_paid,
    COALESCE(s.total_qty, 0) as purchased_qty,
    COALESCE(s.invoice_count, 0) as invoice_count,
    COALESCE(s.total_purchase, 0) - (COALESCE(s.sale_paid, 0) + COALESCE(p.extra_paid, 0)) as balance
  FROM pet_customers c
  LEFT JOIN (
    SELECT
      customer_id,
      SUM(quantity * unit_price) as total_purchase,
      SUM(COALESCE(paid_amount, 0)) as sale_paid,
      SUM(quantity) as total_qty,
      COUNT(id) as invoice_count
    FROM inventory_transactions
    WHERE shop_id = ? AND txn_type = 'sale'
    GROUP BY customer_id
  ) s ON s.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, SUM(amount) as extra_paid
    FROM pet_payments
    WHERE shop_id = ?
    GROUP BY customer_id
  ) p ON p.customer_id = c.id
  WHERE c.shop_id = ?
`;

const customerBalanceParams = (shopId) => [shopId, shopId, shopId];

const getShopOrThrow = async (shopId) => {
  const shop = await pGet('SELECT id, shop_name, business_mode FROM shops WHERE id = ?', [shopId]);
  if (!shop) {
    const error = new Error('Shop not found');
    error.statusCode = 404;
    throw error;
  }
  if (!hasPetInventoryMode(shop)) {
    const error = new Error('This shop is not enabled for packaged bottle inventory');
    error.statusCode = 403;
    throw error;
  }
  return { ...shop, business_mode: normalizeBusinessMode(shop.business_mode) };
};

const normalizeCustomerType = (value) => {
  const allowed = ['Shop', 'Distributor', 'Office', 'Retail'];
  const found = allowed.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase());
  return found || 'Retail';
};

const normalizePaymentType = (value) => {
  const type = String(value || 'cash').trim().toLowerCase();
  return ['cash', 'credit', 'partial'].includes(type) ? type : 'cash';
};

const createInvoiceNumber = (shopId, saleId) => (
  `PET-${String(shopId).padStart(3, '0')}-${String(saleId).padStart(6, '0')}`
);

const withNumbers = (item, hideAmounts = false) => ({
  ...item,
  current_stock: Number(item.current_stock || 0),
  opening_stock: Number(item.opening_stock || 0),
  min_stock_alert: Number(item.min_stock_alert || 20),
  cost_price: hideAmounts ? null : Number(item.cost_price || 0),
  sale_price: hideAmounts ? null : Number(item.sale_price || 0),
  is_active: Boolean(item.is_active),
});

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

    res.json(items.map((item) => withNumbers(item, hideAmounts)));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching products' });
  }
};

const createItem = async (req, res) => {
  try {
    const { shop_id, id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can manage products' });
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
      min_stock_alert,
      is_active,
    } = req.body;

    if (!String(item_name || '').trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!String(size_label || '').trim()) {
      return res.status(400).json({ message: 'Bottle size is required' });
    }

    const result = await pRun(
      `INSERT INTO inventory_items
        (shop_id, item_name, category, size_label, unit_type, cost_price, sale_price, opening_stock, min_stock_alert, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        String(item_name).trim(),
        String(category || 'Packaged Water Bottle').trim(),
        String(size_label).trim(),
        String(unit_type || 'bottles').trim(),
        Number(cost_price || 0),
        Number(sale_price || 0),
        Math.max(0, Number(opening_stock || 0)),
        Math.max(0, Number(min_stock_alert || 20)),
        is_active === false ? 0 : 1,
        id,
      ]
    );

    res.status(201).json({ message: 'Product created successfully', item_id: result.lastID });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating product' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { shop_id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can manage products' });
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
      min_stock_alert,
      is_active,
    } = req.body;

    const existing = await pGet('SELECT id FROM inventory_items WHERE id = ? AND shop_id = ?', [id, shop_id]);
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    if (!String(item_name || '').trim()) return res.status(400).json({ message: 'Product name is required' });
    if (!String(size_label || '').trim()) return res.status(400).json({ message: 'Bottle size is required' });

    await pRun(
      `UPDATE inventory_items
          SET item_name = ?,
              category = ?,
              size_label = ?,
              unit_type = ?,
              cost_price = ?,
              sale_price = ?,
              opening_stock = ?,
              min_stock_alert = ?,
              is_active = ?
        WHERE id = ? AND shop_id = ?`,
      [
        String(item_name).trim(),
        String(category || 'Packaged Water Bottle').trim(),
        String(size_label).trim(),
        String(unit_type || 'bottles').trim(),
        Number(cost_price || 0),
        Number(sale_price || 0),
        Math.max(0, Number(opening_stock || 0)),
        Math.max(0, Number(min_stock_alert || 20)),
        is_active === false ? 0 : 1,
        id,
        shop_id,
      ]
    );

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error updating product' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { shop_id, type } = req.user;
    if (type === 'staff') return res.status(403).json({ message: 'Only shop owner can remove products' });

    await getShopOrThrow(shop_id);
    await pRun('UPDATE inventory_items SET is_active = 0 WHERE id = ? AND shop_id = ?', [req.params.id, shop_id]);
    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error archiving product' });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);
    const customers = await pAll(
      `${PET_BALANCE_SUBQUERY}
        ORDER BY c.is_active DESC, c.name ASC`,
      customerBalanceParams(shop_id)
    );
    res.json(customers.map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
      total_purchase: Number(row.total_purchase || 0),
      total_paid: Number(row.total_paid || 0),
      purchased_qty: Number(row.purchased_qty || 0),
      invoice_count: Number(row.invoice_count || 0),
      outstanding_balance: Math.max(0, Number(row.balance || 0)),
      advance_balance: Math.max(0, -Number(row.balance || 0)),
      balance: Number(row.balance || 0),
    })));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching PET customers' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);

    const { name, phone, address, customer_type, is_active } = req.body;
    if (!String(name || '').trim()) return res.status(400).json({ message: 'Customer name is required' });

    const result = await pRun(
      `INSERT INTO pet_customers (shop_id, name, phone, address, customer_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        String(name).trim(),
        String(phone || '').trim(),
        String(address || '').trim(),
        normalizeCustomerType(customer_type),
        is_active === false ? 0 : 1,
      ]
    );

    res.status(201).json({ message: 'Customer created successfully', customer_id: result.lastID });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating customer' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);

    const { name, phone, address, customer_type, is_active } = req.body;
    if (!String(name || '').trim()) return res.status(400).json({ message: 'Customer name is required' });

    const result = await pRun(
      `UPDATE pet_customers
          SET name = ?, phone = ?, address = ?, customer_type = ?, is_active = ?
        WHERE id = ? AND shop_id = ?`,
      [
        String(name).trim(),
        String(phone || '').trim(),
        String(address || '').trim(),
        normalizeCustomerType(customer_type),
        is_active === false ? 0 : 1,
        req.params.id,
        shop_id,
      ]
    );

    if (!result.changes) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error updating customer' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { shop_id } = req.user;
    const shop = await getShopOrThrow(shop_id);
    const hideAmounts = isRestrictedPetCashier(req.user, shop);
    const { start_date, end_date, item_id, customer_id, txn_type } = req.query;

    let sql = `
      SELECT t.*, i.item_name, i.size_label, i.unit_type, c.name as customer_name, c.phone as customer_phone, c.customer_type
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
      LEFT JOIN pet_customers c ON c.id = t.customer_id AND c.shop_id = t.shop_id
      WHERE t.shop_id = ?
    `;
    const params = [shop_id];

    if (start_date) { sql += ' AND t.txn_date >= ?'; params.push(String(start_date)); }
    if (end_date) { sql += ' AND t.txn_date <= ?'; params.push(String(end_date)); }
    if (item_id) { sql += ' AND t.item_id = ?'; params.push(Number(item_id)); }
    if (customer_id) { sql += ' AND t.customer_id = ?'; params.push(Number(customer_id)); }
    if (txn_type) { sql += ' AND t.txn_type = ?'; params.push(String(txn_type)); }

    sql += ' ORDER BY t.txn_date DESC, t.id DESC LIMIT 250';
    const rows = await pAll(sql, params);

    res.json(rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity || 0),
      unit_price: hideAmounts ? null : Number(row.unit_price || 0),
      paid_amount: hideAmounts ? null : Number(row.paid_amount || 0),
      total_amount: hideAmounts ? null : Number(row.quantity || 0) * Number(row.unit_price || 0),
      outstanding_amount: hideAmounts ? null : Math.max(0, (Number(row.quantity || 0) * Number(row.unit_price || 0)) - Number(row.paid_amount || 0)),
    })));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching sales entries' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { shop_id, id, role, type } = req.user;
    await getShopOrThrow(shop_id);

    if (type === 'staff' && role !== 'cashier') {
      return res.status(403).json({ message: 'Only shop owner or cashier can add PET entries' });
    }

    const {
      item_id,
      customer_id,
      txn_type,
      quantity,
      unit_price,
      invoice_number,
      payment_type,
      paid_amount,
      notes,
      txn_date,
    } = req.body;
    const normalizedType = String(txn_type || '').trim();
    const allowedTypes = ['stock_in', 'sale', 'damage', 'return_in'];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: 'Please select a valid entry type' });
    }

    const qty = Number(quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be greater than zero' });

    const item = await pGet('SELECT * FROM inventory_items WHERE id = ? AND shop_id = ? AND is_active = 1', [item_id, shop_id]);
    if (!item) return res.status(404).json({ message: 'Product not found' });

    const stockRow = await pGet(
      `${STOCK_TOTAL_SQL}
       WHERE i.shop_id = ? AND i.id = ?
       GROUP BY i.id`,
      [shop_id, Number(item_id)]
    );
    const currentStock = Number(stockRow?.current_stock || 0);
    if (['sale', 'damage'].includes(normalizedType) && qty > currentStock) {
      return res.status(400).json({ message: `Only ${currentStock} bottles are available for this product.` });
    }

    let customer = null;
    if (normalizedType === 'sale') {
      if (!customer_id) return res.status(400).json({ message: 'Customer is required for sale invoice' });
      customer = await pGet('SELECT id FROM pet_customers WHERE id = ? AND shop_id = ? AND is_active = 1', [customer_id, shop_id]);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
    }

    const effectivePrice = Number(
      typeof unit_price !== 'undefined' && unit_price !== ''
        ? unit_price
        : normalizedType === 'sale'
          ? item.sale_price
          : item.cost_price
    );
    const totalAmount = qty * (Number.isFinite(effectivePrice) ? effectivePrice : 0);
    const normalizedPaymentType = normalizePaymentType(payment_type);
    const effectivePaid = normalizedType !== 'sale'
      ? 0
      : normalizedPaymentType === 'cash'
        ? totalAmount
        : Math.max(0, Math.min(totalAmount, Number(paid_amount || 0)));

    const result = await pRun(
      `INSERT INTO inventory_transactions
        (shop_id, item_id, customer_id, invoice_number, txn_type, quantity, unit_price, payment_type, paid_amount, notes, txn_date, created_by, created_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        Number(item_id),
        normalizedType === 'sale' ? Number(customer_id) : null,
        String(invoice_number || '').trim() || null,
        normalizedType,
        qty,
        Number.isFinite(effectivePrice) ? effectivePrice : 0,
        normalizedPaymentType,
        effectivePaid,
        String(notes || '').trim(),
        String(txn_date || toPkDateText()),
        id,
        role,
      ]
    );

    let finalInvoiceNumber = String(invoice_number || '').trim();
    if (normalizedType === 'sale' && !finalInvoiceNumber) {
      finalInvoiceNumber = createInvoiceNumber(shop_id, result.lastID);
      await pRun('UPDATE inventory_transactions SET invoice_number = ? WHERE id = ? AND shop_id = ?', [finalInvoiceNumber, result.lastID, shop_id]);
    }

    res.status(201).json({
      message: normalizedType === 'sale' ? 'Sale invoice saved successfully' : 'Stock entry saved successfully',
      transaction_id: result.lastID,
      invoice_number: finalInvoiceNumber || null,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error saving entry' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { shop_id, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can delete sale or stock entries' });
    }

    await getShopOrThrow(shop_id);

    const entry = await pGet(
      `SELECT t.*, i.item_name, i.size_label
         FROM inventory_transactions t
         JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
        WHERE t.id = ? AND t.shop_id = ?`,
      [req.params.id, shop_id]
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    await pRun('DELETE FROM inventory_transactions WHERE id = ? AND shop_id = ?', [req.params.id, shop_id]);

    res.json({
      message: entry.txn_type === 'sale'
        ? 'Sale invoice deleted. Stock, revenue, and customer balance have been recalculated.'
        : 'Stock entry deleted. Product stock has been recalculated.',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error deleting entry' });
  }
};

const getCustomerLedger = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);

    const customer = await pGet(`${PET_BALANCE_SUBQUERY} AND c.id = ?`, [...customerBalanceParams(shop_id), req.params.id]);
    if (!customer) return res.status(404).json({ message: 'Packaged bottle customer not found' });

    const [sales, payments] = await Promise.all([
      pAll(
        `SELECT t.id,
                t.txn_date as date,
                t.invoice_number,
                t.quantity,
                t.unit_price,
                COALESCE(t.paid_amount, 0) as paid_amount,
                (t.quantity * t.unit_price) as amount,
                i.item_name,
                i.size_label,
                'sale' as type
           FROM inventory_transactions t
           JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
          WHERE t.shop_id = ? AND t.customer_id = ? AND t.txn_type = 'sale'
          ORDER BY t.txn_date ASC, t.id ASC`,
        [shop_id, req.params.id]
      ),
      pAll(
        `SELECT id,
                payment_date as date,
                amount,
                notes,
                'payment' as type
           FROM pet_payments
          WHERE shop_id = ? AND customer_id = ?
          ORDER BY payment_date ASC, id ASC`,
        [shop_id, req.params.id]
      ),
    ]);

    const entries = [...sales, ...payments].sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    let runningBalance = 0;
    const ledger = entries.map((entry) => {
      if (entry.type === 'sale') {
        runningBalance += Number(entry.amount || 0) - Number(entry.paid_amount || 0);
      } else {
        runningBalance -= Number(entry.amount || 0);
      }
      return { ...entry, balance: runningBalance };
    });

    const totalBilled = Number(customer.total_purchase || 0);
    const totalPaid = Number(customer.total_paid || 0);
    const currentBalance = totalBilled - totalPaid;

    res.json({
      customer: {
        ...customer,
        is_active: Boolean(customer.is_active),
        total_purchase: totalBilled,
        total_paid: totalPaid,
        outstanding_balance: Math.max(0, currentBalance),
        advance_balance: Math.max(0, -currentBalance),
      },
      ledger,
      totals: {
        total_billed: totalBilled,
        total_paid: totalPaid,
      },
      current_balance: currentBalance,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error loading packaged bottle ledger' });
  }
};

const getPayments = async (req, res) => {
  try {
    const { shop_id } = req.user;
    await getShopOrThrow(shop_id);
    const { customer_id, start_date, end_date } = req.query;

    let sql = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone, c.customer_type
        FROM pet_payments p
        JOIN pet_customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id
       WHERE p.shop_id = ?
    `;
    const params = [shop_id];

    if (customer_id) { sql += ' AND p.customer_id = ?'; params.push(customer_id); }
    if (start_date) { sql += ' AND p.payment_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND p.payment_date <= ?'; params.push(end_date); }

    sql += ' ORDER BY p.payment_date DESC, p.id DESC LIMIT 250';
    const rows = await pAll(sql, params);
    res.json(rows.map((row) => ({ ...row, amount: Number(row.amount || 0) })));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching packaged bottle payments' });
  }
};

const createPayment = async (req, res) => {
  try {
    const { shop_id, id, role, type } = req.user;
    if (type === 'staff') {
      return res.status(403).json({ message: 'Only shop owner can record packaged bottle customer payments' });
    }

    await getShopOrThrow(shop_id);

    const { customer_id, amount, payment_date, notes } = req.body;
    if (!customer_id) return res.status(400).json({ message: 'Customer is required' });
    const paymentAmount = Number(amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than zero' });
    }

    const customer = await pGet('SELECT id FROM pet_customers WHERE id = ? AND shop_id = ? AND is_active = 1', [customer_id, shop_id]);
    if (!customer) return res.status(404).json({ message: 'Packaged bottle customer not found' });

    const result = await pRun(
      `INSERT INTO pet_payments (shop_id, customer_id, amount, payment_date, notes, created_by, created_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_id,
        Number(customer_id),
        paymentAmount,
        String(payment_date || toPkDateText()),
        String(notes || '').trim(),
        id,
        role,
      ]
    );

    res.status(201).json({ message: 'Packaged bottle payment recorded successfully', payment_id: result.lastID });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error recording packaged bottle payment' });
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

    const [items, stockTotals, todaySales, weekSales, monthSales, todayPaid, monthPaid, balanceTotals, lowStock, recentTransactions, trendRows, customerCount] = await Promise.all([
      pAll(`${STOCK_TOTAL_SQL} WHERE i.shop_id = ? AND i.is_active = 1 GROUP BY i.id ORDER BY i.item_name ASC`, [shop_id]),
      pGet(`SELECT COUNT(*) as total_products, COALESCE(SUM(current_stock), 0) as current_stock FROM (${STOCK_TOTAL_SQL} WHERE i.shop_id = ? AND i.is_active = 1 GROUP BY i.id) rows`, [shop_id]),
      pGet(`SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(quantity * unit_price), 0) as amount FROM inventory_transactions WHERE shop_id = ? AND txn_type = 'sale' AND txn_date = ?`, [shop_id, today]),
      pGet(`SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(quantity * unit_price), 0) as amount FROM inventory_transactions WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?`, [shop_id, weekStart, today]),
      pGet(`SELECT COALESCE(SUM(quantity), 0) as qty, COALESCE(SUM(quantity * unit_price), 0) as amount FROM inventory_transactions WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?`, [shop_id, monthStart, today]),
      pGet(
        `SELECT
           COALESCE((SELECT SUM(COALESCE(paid_amount, 0)) FROM inventory_transactions WHERE shop_id = ? AND txn_type = 'sale' AND txn_date = ?), 0) +
           COALESCE((SELECT SUM(amount) FROM pet_payments WHERE shop_id = ? AND payment_date = ?), 0) as amount`,
        [shop_id, today, shop_id, today]
      ),
      pGet(
        `SELECT
           COALESCE((SELECT SUM(COALESCE(paid_amount, 0)) FROM inventory_transactions WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?), 0) +
           COALESCE((SELECT SUM(amount) FROM pet_payments WHERE shop_id = ? AND payment_date BETWEEN ? AND ?), 0) as amount`,
        [shop_id, monthStart, today, shop_id, monthStart, today]
      ),
      pGet(
        `SELECT
           COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total_outstanding,
           COALESCE(SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END), 0) as total_advance
         FROM (${PET_BALANCE_SUBQUERY}) balances`,
        customerBalanceParams(shop_id)
      ),
      pAll(`SELECT * FROM (${STOCK_TOTAL_SQL} WHERE i.shop_id = ? AND i.is_active = 1 GROUP BY i.id) rows WHERE current_stock <= min_stock_alert ORDER BY current_stock ASC, item_name ASC LIMIT 8`, [shop_id]),
      pAll(`SELECT t.*, i.item_name, i.size_label, i.unit_type, c.name as customer_name FROM inventory_transactions t JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id LEFT JOIN pet_customers c ON c.id = t.customer_id AND c.shop_id = t.shop_id WHERE t.shop_id = ? ORDER BY t.txn_date DESC, t.id DESC LIMIT 10`, [shop_id]),
      pAll(`SELECT txn_date, COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity ELSE 0 END), 0) as sales_qty, COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity * unit_price ELSE 0 END), 0) as sales_amount FROM inventory_transactions WHERE shop_id = ? AND txn_date BETWEEN ? AND ? GROUP BY txn_date ORDER BY txn_date ASC`, [shop_id, weekStart, today]),
      pGet(`SELECT COUNT(*) as total FROM pet_customers WHERE shop_id = ? AND is_active = 1`, [shop_id]),
    ]);

    res.json({
      business_mode: normalizeBusinessMode(shop.business_mode),
      total_products: Number(stockTotals?.total_products || 0),
      total_skus: Number(stockTotals?.total_products || 0),
      active_customers: Number(customerCount?.total || 0),
      current_stock: Number(stockTotals?.current_stock || 0),
      today_sales_qty: Number(todaySales?.qty || 0),
      week_sales_qty: Number(weekSales?.qty || 0),
      month_sales_qty: Number(monthSales?.qty || 0),
      today_sales_amount: hideAmounts ? null : Number(todaySales?.amount || 0),
      week_sales_amount: hideAmounts ? null : Number(weekSales?.amount || 0),
      month_sales_amount: hideAmounts ? null : Number(monthSales?.amount || 0),
      today_cash_collected: hideAmounts ? null : Number(todayPaid?.amount || 0),
      month_cash_collected: hideAmounts ? null : Number(monthPaid?.amount || 0),
      total_outstanding: hideAmounts ? null : Number(balanceTotals?.total_outstanding || 0),
      total_advance: hideAmounts ? null : Number(balanceTotals?.total_advance || 0),
      month_pending_amount: hideAmounts ? null : Math.max(0, Number(monthSales?.amount || 0) - Number(monthPaid?.amount || 0)),
      low_stock_count: lowStock.length,
      low_stock_items: lowStock.map((row) => withNumbers(row, hideAmounts)),
      items: items.map((row) => withNumbers(row, hideAmounts)),
      recent_transactions: recentTransactions.map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unit_price: hideAmounts ? null : Number(row.unit_price || 0),
        total_amount: hideAmounts ? null : Number(row.quantity || 0) * Number(row.unit_price || 0),
      })),
      trend: trendRows.map((row) => ({
        ...row,
        sales_qty: Number(row.sales_qty || 0),
        sales_amount: hideAmounts ? null : Number(row.sales_amount || 0),
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

    const [productSummary, dailyTrend, lowStock, customerSummary, recentSales, topProduct] = await Promise.all([
      pAll(
        `SELECT i.id, i.item_name, i.size_label, i.unit_type, i.sale_price, i.cost_price, COALESCE(i.min_stock_alert, 20) as min_stock_alert,
                (COALESCE(i.opening_stock, 0) + COALESCE(SUM(CASE WHEN t.txn_type IN ('stock_in','return_in','adjustment_in') THEN t.quantity WHEN t.txn_type IN ('sale','damage','adjustment_out') THEN -t.quantity ELSE 0 END), 0)) as current_stock,
                COALESCE(SUM(CASE WHEN t.txn_type = 'sale' AND t.txn_date = ? THEN t.quantity ELSE 0 END), 0) as sold_today,
                COALESCE(SUM(CASE WHEN t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ? THEN t.quantity ELSE 0 END), 0) as sold_qty,
                COALESCE(SUM(CASE WHEN t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ? THEN t.quantity * t.unit_price ELSE 0 END), 0) as sold_amount
           FROM inventory_items i
           LEFT JOIN inventory_transactions t ON t.item_id = i.id AND t.shop_id = i.shop_id
          WHERE i.shop_id = ? AND i.is_active = 1
          GROUP BY i.id
          ORDER BY sold_qty DESC, i.item_name ASC`,
        [toPkDateText(), start_date, end_date, start_date, end_date, shop_id]
      ),
      pAll(
        `SELECT txn_date,
                COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity ELSE 0 END), 0) as sales_qty,
                COALESCE(SUM(CASE WHEN txn_type = 'sale' THEN quantity * unit_price ELSE 0 END), 0) as sales_amount
           FROM inventory_transactions
          WHERE shop_id = ? AND txn_date BETWEEN ? AND ?
          GROUP BY txn_date
          ORDER BY txn_date ASC`,
        [shop_id, start_date, end_date]
      ),
      pAll(`SELECT * FROM (${STOCK_TOTAL_SQL} WHERE i.shop_id = ? AND i.is_active = 1 GROUP BY i.id) rows WHERE current_stock <= min_stock_alert ORDER BY current_stock ASC, item_name ASC`, [shop_id]),
      pAll(
        `SELECT c.id, c.name, c.phone, c.customer_type,
                COALESCE(s.purchased_qty, 0) as purchased_qty,
                COALESCE(s.purchased_amount, 0) as purchased_amount,
                COALESCE(s.sale_paid, 0) + COALESCE(p.extra_paid, 0) as paid_amount,
                COALESCE(s.purchased_amount, 0) - (COALESCE(s.sale_paid, 0) + COALESCE(p.extra_paid, 0)) as outstanding_balance
           FROM pet_customers c
           LEFT JOIN (
             SELECT customer_id,
                    SUM(quantity) as purchased_qty,
                    SUM(quantity * unit_price) as purchased_amount,
                    SUM(COALESCE(paid_amount, 0)) as sale_paid
               FROM inventory_transactions
              WHERE shop_id = ? AND txn_type = 'sale' AND txn_date BETWEEN ? AND ?
              GROUP BY customer_id
           ) s ON s.customer_id = c.id
           LEFT JOIN (
             SELECT customer_id, SUM(amount) as extra_paid
               FROM pet_payments
              WHERE shop_id = ? AND payment_date BETWEEN ? AND ?
              GROUP BY customer_id
           ) p ON p.customer_id = c.id
          WHERE c.shop_id = ?
          GROUP BY c.id
          ORDER BY purchased_amount DESC, c.name ASC`,
        [shop_id, start_date, end_date, shop_id, start_date, end_date, shop_id]
      ),
      pAll(
        `SELECT t.*, i.item_name, i.size_label, i.unit_type, c.name as customer_name, c.customer_type
           FROM inventory_transactions t
           JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
           LEFT JOIN pet_customers c ON c.id = t.customer_id AND c.shop_id = t.shop_id
          WHERE t.shop_id = ? AND t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ?
          ORDER BY t.txn_date DESC, t.id DESC
          LIMIT 80`,
        [shop_id, start_date, end_date]
      ),
      pGet(
        `SELECT i.item_name, i.size_label, COALESCE(SUM(t.quantity), 0) as sold_qty
           FROM inventory_transactions t
           JOIN inventory_items i ON i.id = t.item_id AND i.shop_id = t.shop_id
          WHERE t.shop_id = ? AND t.txn_type = 'sale' AND t.txn_date BETWEEN ? AND ?
          GROUP BY i.id
          ORDER BY sold_qty DESC
          LIMIT 1`,
        [shop_id, start_date, end_date]
      ),
    ]);

    const totalSoldQty = productSummary.reduce((sum, row) => sum + Number(row.sold_qty || 0), 0);
    const totalSoldAmount = productSummary.reduce((sum, row) => sum + Number(row.sold_amount || 0), 0);
    const totalOutstanding = customerSummary.reduce((sum, row) => sum + Math.max(0, Number(row.outstanding_balance || 0)), 0);
    const totalCollected = customerSummary.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);

    res.json({
      business_mode: normalizeBusinessMode(shop.business_mode),
      summary: {
        total_products: productSummary.length,
        total_sold_qty: totalSoldQty,
        total_sold_amount: hideAmounts ? null : totalSoldAmount,
        total_collected: hideAmounts ? null : totalCollected,
        total_outstanding: hideAmounts ? null : totalOutstanding,
        low_stock_count: lowStock.length,
        top_product: topProduct?.item_name ? `${topProduct.item_name} ${topProduct.size_label || ''}`.trim() : null,
      },
      product_summary: productSummary.map((row) => ({
        ...row,
        current_stock: Number(row.current_stock || 0),
        min_stock_alert: Number(row.min_stock_alert || 20),
        sold_today: Number(row.sold_today || 0),
        sold_qty: Number(row.sold_qty || 0),
        sold_amount: hideAmounts ? null : Number(row.sold_amount || 0),
        sale_price: hideAmounts ? null : Number(row.sale_price || 0),
      })),
      customer_summary: customerSummary.map((row) => ({
        ...row,
        purchased_qty: Number(row.purchased_qty || 0),
        purchased_amount: hideAmounts ? null : Number(row.purchased_amount || 0),
        paid_amount: hideAmounts ? null : Number(row.paid_amount || 0),
        outstanding_balance: hideAmounts ? null : Math.max(0, Number(row.outstanding_balance || 0)),
        advance_balance: hideAmounts ? null : Math.max(0, -Number(row.outstanding_balance || 0)),
      })),
      daily_trend: dailyTrend.map((row) => ({
        ...row,
        sales_qty: Number(row.sales_qty || 0),
        sales_amount: hideAmounts ? null : Number(row.sales_amount || 0),
      })),
      low_stock: lowStock.map((row) => withNumbers(row, hideAmounts)),
      recent_sales: recentSales.map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unit_price: hideAmounts ? null : Number(row.unit_price || 0),
        paid_amount: hideAmounts ? null : Number(row.paid_amount || 0),
        total_amount: hideAmounts ? null : Number(row.quantity || 0) * Number(row.unit_price || 0),
        outstanding_amount: hideAmounts ? null : Math.max(0, (Number(row.quantity || 0) * Number(row.unit_price || 0)) - Number(row.paid_amount || 0)),
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
  getCustomers,
  createCustomer,
  updateCustomer,
  getCustomerLedger,
  getTransactions,
  createTransaction,
  deleteTransaction,
  getPayments,
  createPayment,
  getSummary,
  getReports,
};
