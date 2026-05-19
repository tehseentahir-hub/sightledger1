/* eslint-disable no-console */
const API = 'http://127.0.0.1:5000/api';

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(`POST ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function get(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(`GET ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function put(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(`PUT ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

async function del(path, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error(`DELETE ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectBlocked(fn, name) {
  try {
    await fn();
    return { name, pass: false, details: 'unexpectedly allowed' };
  } catch (err) {
    const blocked = [400, 403, 404].includes(err.status);
    return { name, pass: blocked, details: blocked ? `blocked (${err.status})` : `wrong status (${err.status})` };
  }
}

async function main() {
  const summary = [];
  const now = `${Date.now()}`.slice(-6);

  const admin = await post('/auth/login', { email: 'admin@aquaflow.com', password: 'admin123' });
  const adminToken = admin.token;

  const aEmail = `qaA_${now}@aquaflow.com`;
  const bEmail = `qaB_${now}@aquaflow.com`;

  await post('/admin/shops', {
    shop_name: `QA-A-${now}`,
    owner_name: 'QA A',
    phone: '03000001001',
    address: 'Lahore',
    email: aEmail,
    password: 'qa12345',
    subscription_type: 'Plus',
    duration_days: 30,
  }, adminToken);

  await post('/admin/shops', {
    shop_name: `QA-B-${now}`,
    owner_name: 'QA B',
    phone: '03000001002',
    address: 'Karachi',
    email: bEmail,
    password: 'qa12345',
    subscription_type: 'Aqua Plus',
    duration_days: 30,
  }, adminToken);

  const aLogin = await post('/auth/login', { email: aEmail, password: 'qa12345' });
  const bLogin = await post('/auth/login', { email: bEmail, password: 'qa12345' });

  const aToken = aLogin.token;
  const bToken = bLogin.token;

  await post('/customers', {
    name: 'Cust A',
    phone: '03111111111',
    address: 'A',
    bottle_type: '19 Liter',
    rate_per_bottle: 100,
    payment_type: 'credit',
    deposit_bottles: 0,
    is_active: true,
  }, aToken);

  await post('/customers', {
    name: 'Cust B',
    phone: '03222222222',
    address: 'B',
    bottle_type: '19 Liter',
    rate_per_bottle: 120,
    payment_type: 'credit',
    deposit_bottles: 0,
    is_active: true,
  }, bToken);

  const aCustomers = await get('/customers', aToken);
  const bCustomers = await get('/customers', bToken);
  const aId = aCustomers[0].id;
  const bId = bCustomers[0].id;

  summary.push(await expectBlocked(
    () => put(`/customers/${bId}`, {
      name: 'HACKED',
      phone: '03222222222',
      address: 'X',
      bottle_type: '19 Liter',
      rate_per_bottle: 999,
      payment_type: 'credit',
      deposit_bottles: 0,
      is_active: true,
    }, aToken),
    'Cross-shop customer update blocked'
  ));

  summary.push(await expectBlocked(
    () => del(`/customers/${bId}`, aToken),
    'Cross-shop customer delete blocked'
  ));

  summary.push(await expectBlocked(
    () => post('/payments', {
      customer_id: bId,
      amount: 250,
      payment_date: '2026-05-18',
      payment_type: 'partial',
      notes: 'cross',
    }, aToken),
    'Cross-shop payment blocked'
  ));

  summary.push(await expectBlocked(
    () => post('/deliveries', {
      customer_id: 999999,
      delivery_date: '2026-05-18',
      bottles_delivered: 5,
      bottles_returned: 0,
      delivery_type: 'home_delivery',
    }, aToken),
    'Invalid home delivery customer blocked'
  ));

  await post('/payments', {
    customer_id: aId,
    amount: 500,
    payment_date: '2026-05-18',
    payment_type: 'partial',
    notes: 'valid own',
  }, aToken);
  summary.push({ name: 'Own-shop payment works', pass: true, details: 'created' });

  await post('/deliveries', {
    customer_id: aId,
    delivery_date: '2026-05-18',
    bottles_delivered: 10,
    bottles_returned: 0,
    delivery_type: 'home_delivery',
  }, aToken);
  summary.push({ name: 'Own-shop delivery works', pass: true, details: 'created' });

  const outstanding = await get('/payments/outstanding', aToken);
  const ali = (outstanding.outstanding || []).find((r) => r.id === aId);
  assert(ali && Number(ali.outstanding) >= 500, 'Outstanding calculation mismatch');
  summary.push({ name: 'Outstanding report consistency', pass: true, details: `outstanding=${ali.outstanding}` });

  const meA = await get('/auth/me', aToken);
  const planDurationDays = Math.ceil((new Date(meA.subscription_expiry) - new Date(meA.subscription_start)) / (1000 * 60 * 60 * 24));
  assert(planDurationDays >= 29, 'Subscription duration mismatch for monthly plan');
  summary.push({ name: 'Plan duration consistency', pass: true, details: `duration=${planDurationDays} days` });

  const failed = summary.filter((s) => !s.pass);
  console.log('\nRegression QA Summary');
  summary.forEach((s) => {
    console.log(`${s.pass ? 'PASS' : 'FAIL'} - ${s.name}: ${s.details}`);
  });
  console.log(`\nTotal: ${summary.length}, Passed: ${summary.length - failed.length}, Failed: ${failed.length}`);

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error('Regression QA failed:', err.message);
  if (err.cause) console.error('Cause:', err.cause);
  if (err.body) console.error(err.body);
  process.exit(1);
});
