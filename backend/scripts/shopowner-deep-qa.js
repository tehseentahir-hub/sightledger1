/* eslint-disable no-console */
const API = 'http://127.0.0.1:5000/api';

async function req(path, { method = 'GET', body, token, params } = {}) {
  const url = new URL(`${API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const e = new Error(`${method} ${path} failed ${res.status}`);
    e.status = res.status;
    e.body = json || text;
    throw e;
  }
  return json;
}

const n = (v) => Number(v || 0);
const approx = (a, b, eps = 0.001) => Math.abs(n(a) - n(b)) <= eps;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const today = new Date().toISOString().split('T')[0];
  const start = today.slice(0, 8) + '01';
  const end = today;
  const out = [];

  const admin = await req('/auth/login', { method: 'POST', body: { email: 'admin@aquaflow.com', password: 'admin123' } });

  const emailA = `deepA_${stamp}@aq.com`;
  const emailB = `deepB_${stamp}@aq.com`;

  await req('/admin/shops', {
    method: 'POST',
    token: admin.token,
    body: {
      shop_name: `Deep QA A ${stamp}`,
      owner_name: 'Owner A',
      phone: '03001110001',
      address: 'Lahore',
      email: emailA,
      password: 'deep12345',
      subscription_type: 'Plus',
      duration_days: 30,
    },
  });
  await req('/admin/shops', {
    method: 'POST',
    token: admin.token,
    body: {
      shop_name: `Deep QA B ${stamp}`,
      owner_name: 'Owner B',
      phone: '03001110002',
      address: 'Karachi',
      email: emailB,
      password: 'deep12345',
      subscription_type: 'Aqua Plus',
      duration_days: 30,
    },
  });

  const ownerA = await req('/auth/login', { method: 'POST', body: { email: emailA, password: 'deep12345' } });
  const ownerB = await req('/auth/login', { method: 'POST', body: { email: emailB, password: 'deep12345' } });

  // Staff/rider
  await req('/staff', {
    method: 'POST',
    token: ownerA.token,
    body: { name: 'Rider One', role: 'rider', phone: `0399${stamp}`, password: 'rider123' },
  });
  const riders = await req('/staff', { token: ownerA.token });
  const rider = riders.find((r) => r.role === 'rider');
  assert(rider, 'Rider not created');

  // Customers
  await req('/customers', {
    method: 'POST',
    token: ownerA.token,
    body: {
      name: 'Ali Credit',
      phone: '03111111111',
      address: 'A',
      bottle_type: '19 Liter',
      rate_per_bottle: 100,
      payment_type: 'credit',
      deposit_bottles: 0,
      security_deposit_amount: 2000,
      is_active: true,
    },
  });
  await req('/customers', {
    method: 'POST',
    token: ownerA.token,
    body: {
      name: 'Faisal Credit',
      phone: '03222222222',
      address: 'B',
      bottle_type: '19 Liter',
      rate_per_bottle: 150,
      payment_type: 'credit',
      deposit_bottles: 0,
      security_deposit_amount: 0,
      is_active: true,
    },
  });

  const customers = await req('/customers', { token: ownerA.token });
  const ali = customers.find((c) => c.name === 'Ali Credit');
  const faisal = customers.find((c) => c.name === 'Faisal Credit');
  assert(ali && faisal, 'Customers missing');

  // Deliveries: home + walk-in
  await req('/deliveries', {
    method: 'POST',
    token: ownerA.token,
    body: {
      customer_id: ali.id,
      rider_id: rider.id,
      delivery_date: today,
      bottles_delivered: 10,
      bottles_returned: 0,
      delivery_type: 'home_delivery',
      notes: 'Ali home',
    },
  });
  await req('/deliveries', {
    method: 'POST',
    token: ownerA.token,
    body: {
      customer_id: faisal.id,
      rider_id: rider.id,
      delivery_date: today,
      bottles_delivered: 4,
      bottles_returned: 0,
      delivery_type: 'home_delivery',
      notes: 'Faisal home',
    },
  });
  await req('/deliveries', {
    method: 'POST',
    token: ownerA.token,
    body: {
      customer_id: 1,
      is_walkin: true,
      walkin_name: 'Walkin One',
      walkin_rate_per_bottle: 120,
      delivery_date: today,
      bottles_delivered: 5,
      bottles_returned: 0,
      delivery_type: 'walk_in',
      notes: 'Walkin',
    },
  });

  // Payments: one partial, one advance
  await req('/payments', {
    method: 'POST',
    token: ownerA.token,
    body: { customer_id: ali.id, amount: 600, payment_date: today, payment_type: 'partial', notes: 'Ali partial' },
  });
  await req('/payments', {
    method: 'POST',
    token: ownerA.token,
    body: { customer_id: faisal.id, amount: 1000, payment_date: today, payment_type: 'advance', notes: 'Faisal advance' },
  });

  // Expenses
  await req('/expenses', {
    method: 'POST',
    token: ownerA.token,
    body: { expense_type: 'fuel', amount: 500, description: 'Fuel run', expense_date: today },
  });

  // Expected maths
  const expectedSales = 1000 + 600 + 600; // Ali + Faisal + walkin
  const expectedPending = 400; // Ali 1000 billed - 600 paid
  const expectedAdvance = 400; // Faisal 600 billed - 1000 paid => 400 advance
  const expectedTodayCollection = 600 + 1000 + 600; // payments + walkin cash
  const expectedProfit = expectedSales - 500;

  const dashboard = await req('/dashboard', { token: ownerA.token });
  assert(approx(dashboard.monthly_sales, expectedSales), `Dashboard monthly sales mismatch: ${dashboard.monthly_sales}`);
  assert(approx(dashboard.pending_payments, expectedPending), `Dashboard pending mismatch: ${dashboard.pending_payments}`);
  assert(approx(dashboard.advance_balance, expectedAdvance), `Dashboard advance mismatch: ${dashboard.advance_balance}`);
  assert(approx(dashboard.today_collection, expectedTodayCollection), `Dashboard today collection mismatch: ${dashboard.today_collection}`);
  out.push('Dashboard totals OK');

  const outstanding = await req('/payments/outstanding', { token: ownerA.token });
  const aliRow = (outstanding.outstanding || []).find((r) => r.id === ali.id);
  const faisalRow = (outstanding.advances || []).find((r) => r.id === faisal.id);
  assert(aliRow && approx(aliRow.outstanding, expectedPending), 'Outstanding report mismatch for Ali');
  assert(faisalRow && approx(faisalRow.advance, expectedAdvance), 'Advance report mismatch for Faisal');
  out.push('Outstanding/advance totals OK');

  const profit = await req('/dashboard/reports', {
    token: ownerA.token,
    params: { type: 'profit', start_date: start, end_date: end },
  });
  assert(approx(profit.income, expectedSales), `Profit income mismatch: ${profit.income}`);
  assert(approx(profit.expenses, 500), `Profit expenses mismatch: ${profit.expenses}`);
  assert(approx(profit.profit, expectedProfit), `Profit mismatch: ${profit.profit}`);
  out.push('Profit report OK');

  const daily = await req('/dashboard/reports', {
    token: ownerA.token,
    params: { type: 'daily', start_date: today },
  });
  assert((daily.report || []).length >= 3, 'Daily report missing rows');
  out.push('Daily report rows OK');

  const monthly = await req('/dashboard/reports', {
    token: ownerA.token,
    params: { type: 'monthly', start_date: start, end_date: end },
  });
  assert(approx(monthly.summary?.total_sales, expectedSales), 'Monthly report sales mismatch');
  out.push('Monthly report OK');

  const bottles = await req('/dashboard/reports', {
    token: ownerA.token,
    params: { type: 'bottles', start_date: start, end_date: end },
  });
  assert(n(bottles.circulation?.walkin_deliveries) >= 1, 'Walk-in circulation missing');
  out.push('Bottle circulation OK');

  // Cross shop isolation sanity
  const bCustomers = await req('/customers', { token: ownerB.token });
  assert(!bCustomers.some((c) => c.name === 'Ali Credit' || c.name === 'Faisal Credit'), 'Cross-shop leak detected');
  out.push('Shop isolation read-scope OK');

  console.log('\nDeep Shopowner QA PASSED');
  out.forEach((line, i) => console.log(`${i + 1}. ${line}`));
}

main().catch((err) => {
  console.error('Deep Shopowner QA FAILED:', err.message);
  if (err.body) console.error(err.body);
  process.exit(1);
});

