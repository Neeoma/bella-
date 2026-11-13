/* Bella Paint — server.
   Serves the static site, stores orders / enquiries / products in SQLite,
   provides real admin login (session cookie) and Paystack online payments.

   Environment:
     PORT                  default 8000
     BASE_URL              public URL of the site (for Paystack callback)
     ADMIN_PASSWORD        admin dashboard password (default: bella-admin — change it!)
     PAYSTACK_SECRET_KEY   Paystack secret key; empty disables online payments
*/
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const SAMPLE_PRICE = 2500; // ₦ — sample pot 250ml
const SESSION_HOURS = 12;

/* ---------------- database ---------------- */
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'bella.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, finish TEXT,
    tintable INTEGER DEFAULT 0, descr TEXT, coverage TEXT, sizes TEXT NOT NULL, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, status TEXT NOT NULL,
    customer_name TEXT, customer_phone TEXT, customer_email TEXT, customer_address TEXT,
    payment TEXT, items TEXT NOT NULL, total INTEGER NOT NULL, reference TEXT, paid INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, status TEXT NOT NULL,
    name TEXT, phone TEXT, email TEXT, message TEXT, service TEXT, property TEXT,
    room TEXT, area REAL, litres INTEGER, estimate INTEGER, colour TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
`);

const SEED_PRODUCTS = [
  { id: 'velvet-matt', name: 'Velvet Matt Emulsion', category: 'Interior', finish: 'Matt', tintable: true,
    desc: 'A deep, chalky matt that hides imperfections and gives walls a soft, light-absorbing finish.',
    coverage: '12 m² per litre', sizes: [{ label: '1L', price: 9500 }, { label: '4L', price: 32000 }, { label: '20L', price: 138000 }] },
  { id: 'silk-touch', name: 'Silk Touch Emulsion', category: 'Interior', finish: 'Silk', tintable: true,
    desc: 'Washable mid-sheen for living rooms, hallways and busy family spaces.',
    coverage: '13 m² per litre', sizes: [{ label: '1L', price: 10500 }, { label: '4L', price: 36000 }, { label: '20L', price: 155000 }] },
  { id: 'satin-shield', name: 'Satin Shield Kitchen & Bath', category: 'Interior', finish: 'Satin', tintable: true,
    desc: 'Moisture and steam resistant satin for kitchens and bathrooms.',
    coverage: '12 m² per litre', sizes: [{ label: '1L', price: 12000 }, { label: '4L', price: 41000 }] },
  { id: 'weatherguard', name: 'WeatherGuard Exterior', category: 'Exterior', finish: 'Low sheen', tintable: true,
    desc: 'Flexible exterior coating formulated for heavy rain, humidity and strong sun.',
    coverage: '10 m² per litre', sizes: [{ label: '4L', price: 44000 }, { label: '20L', price: 189000 }] },
  { id: 'texcote', name: 'Texcote Textured Finish', category: 'Exterior', finish: 'Textured', tintable: true,
    desc: 'Heavy-bodied textured coating that covers hairline cracks on rendered walls.',
    coverage: '3 m² per litre', sizes: [{ label: '20L', price: 96000 }, { label: '30kg', price: 128000 }] },
  { id: 'gloss-enamel', name: 'High Gloss Enamel', category: 'Specialty', finish: 'Gloss', tintable: true,
    desc: 'Hard-wearing mirror gloss for doors, trim, metal gates and burglar-proofing.',
    coverage: '14 m² per litre', sizes: [{ label: '1L', price: 11500 }, { label: '4L', price: 39500 }] },
  { id: 'stucco', name: 'Stucco Veneziano', category: 'Specialty', finish: 'Polished plaster', tintable: true,
    desc: 'Decorative polished-plaster effect for feature walls and reception areas.',
    coverage: '4 m² per kg', sizes: [{ label: '5kg', price: 58000 }, { label: '20kg', price: 210000 }] },
  { id: 'primer', name: 'Alkali-Resisting Primer', category: 'Specialty', finish: 'Primer', tintable: false,
    desc: 'Seals new plaster and masonry so your topcoat goes further and lasts longer.',
    coverage: '11 m² per litre', sizes: [{ label: '4L', price: 24000 }, { label: '20L', price: 99000 }] },
  { id: 'roller-kit', name: 'Pro Roller Kit', category: 'Tools', finish: '9-inch', tintable: false,
    desc: 'Microfibre roller, tray and extension pole. Lint-free and reusable.',
    coverage: '', sizes: [{ label: 'Kit', price: 14500 }] },
  { id: 'brush-set', name: 'Angled Brush Set', category: 'Tools', finish: '3 brushes', tintable: false,
    desc: 'Three synthetic-bristle brushes for cutting in and trim work.',
    coverage: '', sizes: [{ label: 'Set', price: 8500 }] }
];

function saveProduct(p, sort) {
  db.prepare(`INSERT INTO products (id, name, category, finish, tintable, descr, coverage, sizes, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, finish=excluded.finish,
      tintable=excluded.tintable, descr=excluded.descr, coverage=excluded.coverage, sizes=excluded.sizes, sort=excluded.sort`)
    .run(p.id, p.name, p.category || '', p.finish || '', p.tintable ? 1 : 0, p.desc || '', p.coverage || '', JSON.stringify(p.sizes), sort || 0);
}
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  SEED_PRODUCTS.forEach((p, i) => saveProduct(p, i));
}

/* ---------------- helpers ---------------- */
const now = () => new Date().toISOString();
const uid = (p) => p + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_STATUS = ['New', 'Confirmed', 'Out for delivery', 'Delivered', 'Cancelled', 'Awaiting payment'];
const ENQ_STATUS = ['New', 'Contacted', 'Quoted', 'Won', 'Closed'];

const rowToProduct = (r) => ({ id: r.id, name: r.name, category: r.category, finish: r.finish, tintable: !!r.tintable, desc: r.descr, coverage: r.coverage, sizes: JSON.parse(r.sizes) });
const rowToOrder = (r) => ({
  id: r.id, date: r.date, status: r.status,
  customer: { name: r.customer_name, phone: r.customer_phone, email: r.customer_email, address: r.customer_address },
  payment: r.payment, items: JSON.parse(r.items), total: r.total, reference: r.reference, paid: !!r.paid
});
const rowToEnquiry = (r) => ({
  id: r.id, date: r.date, status: r.status, name: r.name, phone: r.phone, email: r.email,
  message: r.message, service: r.service, property: r.property, room: r.room,
  area: r.area, litres: r.litres, estimate: r.estimate, colour: r.colour
});

/* Recompute the order total from database prices so clients cannot tamper with it. */
function priceItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) return null;
  let total = 0;
  const priced = [];
  for (const it of items) {
    const qty = Math.min(99, Math.max(1, parseInt(it && it.qty, 10) || 1));
    let price, name;
    if (it && it.productId === 'sample') {
      price = SAMPLE_PRICE; name = 'Sample pot 250ml';
    } else {
      const p = it && db.prepare('SELECT * FROM products WHERE id = ?').get(String(it.productId || ''));
      if (!p) return null;
      const size = JSON.parse(p.sizes).find((s) => s.label === String(it.size || ''));
      if (!size) return null;
      price = size.price; name = p.name;
    }
    total += price * qty;
    priced.push({ productId: String(it.productId), name, size: String(it.size || ''), price, qty, colourId: it.colourId ? str(it.colourId, 40) : null });
  }
  return { total, items: priced };
}

function validCustomer(c) {
  if (!c) return null;
  const name = str(c.name, 120), phone = str(c.phone, 40), email = str(c.email, 120), address = str(c.address, 500);
  if (!name || !phone || !EMAIL_RE.test(email) || !address) return null;
  return { name, phone, email, address };
}

function createOrder(customer, payment, priced, reference) {
  const order = {
    id: uid('BP'), date: now(), status: payment === 'Pay online' ? 'Awaiting payment' : 'New',
    customer, payment, items: priced.items, total: priced.total, reference: reference || null, paid: false
  };
  db.prepare(`INSERT INTO orders (id, date, status, customer_name, customer_phone, customer_email, customer_address, payment, items, total, reference, paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(order.id, order.date, order.status, customer.name, customer.phone, customer.email, customer.address, payment, JSON.stringify(order.items), order.total, order.reference);
  return order;
}

/* ---------------- auth ---------------- */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bella-admin';
const salt = crypto.randomBytes(16);
const passHash = crypto.scryptSync(ADMIN_PASSWORD, salt, 64);
const checkPassword = (pw) => crypto.timingSafeEqual(crypto.scryptSync(String(pw || ''), salt, 64), passHash);

const COOKIE = 'bella_admin';
function sessionFrom(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '');
  if (!m) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(m[1]);
  if (!row || row.expires_at < now()) return null;
  return row;
}
function requireAuth(req, res, next) {
  if (!sessionFrom(req)) return res.status(401).json({ error: 'Not signed in.' });
  next();
}

/* simple login rate limit: 10 attempts per IP per 15 minutes */
const attempts = new Map();
function rateLimited(req) {
  const ip = req.ip || 'unknown';
  const t = Date.now();
  const rec = attempts.get(ip) || { n: 0, reset: t + 15 * 60 * 1000 };
  if (t > rec.reset) { rec.n = 0; rec.reset = t + 15 * 60 * 1000; }
  rec.n += 1;
  attempts.set(ip, rec);
  return rec.n > 10;
}

/* ---------------- app ---------------- */
const app = express();
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});
app.use(express.json({ limit: '100kb', verify: (req, res, buf) => { req.rawBody = buf; } }));

/* static site (only these folders are public) */
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

/* ---------------- public API ---------------- */
app.get('/api/products', (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY sort, name').all().map(rowToProduct));
});

app.post('/api/orders', (req, res) => {
  const customer = validCustomer(req.body && req.body.customer);
  const payment = str(req.body && req.body.payment, 40);
  if (!customer) return res.status(400).json({ error: 'Please provide your name, phone, a valid email and a delivery address.' });
  if (!['Pay on delivery', 'Bank transfer'].includes(payment)) return res.status(400).json({ error: 'Unsupported payment method.' });
  const priced = priceItems(req.body && req.body.items);
  if (!priced) return res.status(400).json({ error: 'Your cart contains an item we cannot price. Please refresh and try again.' });
  res.status(201).json(createOrder(customer, payment, priced));
});

app.post('/api/enquiries', (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120), phone = str(b.phone, 40), email = str(b.email, 120);
  if (!name || !phone || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please provide your name, phone and a valid email.' });
  const enquiry = {
    id: uid('ENQ'), date: now(), status: 'New', name, phone, email,
    message: str(b.message, 1000), service: str(b.service, 80), property: str(b.property, 80),
    room: str(b.room, 200), area: Math.max(0, Number(b.area) || 0), litres: Math.max(0, parseInt(b.litres, 10) || 0),
    estimate: Math.max(0, parseInt(b.estimate, 10) || 0), colour: str(b.colour, 120)
  };
  db.prepare(`INSERT INTO enquiries (id, date, status, name, phone, email, message, service, property, room, area, litres, estimate, colour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(enquiry.id, enquiry.date, enquiry.status, name, phone, email, enquiry.message, enquiry.service, enquiry.property, enquiry.room, enquiry.area, enquiry.litres, enquiry.estimate, enquiry.colour);
  res.status(201).json(enquiry);
});

/* ---------------- Paystack payments ---------------- */
async function paystack(pathname, options) {
  const res = await fetch('https://api.paystack.com' + pathname, Object.assign({
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' }
  }, options || {}));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) throw new Error((data && data.message) || 'Paystack request failed');
  return data.data;
}

app.post('/api/payments/initialize', async (req, res) => {
  if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Online payment is not set up yet. Please choose pay on delivery or bank transfer.' });
  const customer = validCustomer(req.body && req.body.customer);
  if (!customer) return res.status(400).json({ error: 'Please provide your name, phone, a valid email and a delivery address.' });
  const priced = priceItems(req.body && req.body.items);
  if (!priced) return res.status(400).json({ error: 'Your cart contains an item we cannot price. Please refresh and try again.' });
  const reference = 'BP-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const order = createOrder(customer, 'Pay online', priced, reference);
  try {
    const data = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: customer.email, amount: priced.total * 100, reference,
        callback_url: BASE_URL + '/', metadata: { order_id: order.id }
      })
    });
    res.json({ authorization_url: data.authorization_url, reference, orderId: order.id, total: order.total });
  } catch (e) {
    res.status(502).json({ error: 'Could not start the payment. Please try again or choose another payment method.' });
  }
});

function markPaid(reference, amount, currency) {
  const row = db.prepare('SELECT * FROM orders WHERE reference = ?').get(reference);
  if (!row || Number(amount) !== row.total * 100 || currency !== 'NGN') return null;
  if (!row) return null;
  if (!row.paid) {
    db.prepare(`UPDATE orders SET paid = 1, status = 'New' WHERE id = ?`).run(row.id);
    row.paid = 1; row.status = 'New';
  }
  return rowToOrder(row);
}

app.get('/api/payments/verify', async (req, res) => {
  const reference = str(req.query.reference, 80);
  if (!reference) return res.status(400).json({ error: 'Missing payment reference.' });
  const row = db.prepare('SELECT * FROM orders WHERE reference = ?').get(reference);
  if (!row) return res.status(404).json({ error: 'Order not found.' });
  if (row.paid) return res.json({ paid: true, order: rowToOrder(row) });
  if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Online payment is not set up yet.' });
  try {
    const data = await paystack('/transaction/verify/' + encodeURIComponent(reference));
    if (data.status === 'success' && Number(data.amount) === row.total * 100 && data.currency === 'NGN') {
      return res.json({ paid: true, order: markPaid(reference, data.amount, data.currency) });
    }
    res.json({ paid: false, order: rowToOrder(row) });
  } catch (e) {
    res.status(502).json({ error: 'Could not verify the payment. If money left your account, contact us with your reference.' });
  }
});

app.post('/api/payments/webhook', (req, res) => {
  res.sendStatus(200); // acknowledge quickly; verify signature before acting
  if (!PAYSTACK_SECRET || !req.rawBody) return;
  const sig = req.headers['x-paystack-signature'] || '';
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.rawBody).digest('hex');
  const got = Buffer.from(String(sig));
  const want = Buffer.from(expected);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return;
  const event = req.body || {};
  if (event.event === 'charge.success' && event.data && event.data.reference && event.data.status === 'success') {
    markPaid(String(event.data.reference), event.data.amount, event.data.currency);
  }
});

/* ---------------- admin API ---------------- */
app.post('/api/admin/login', (req, res) => {
  if (rateLimited(req)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Incorrect password.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').run(token, expires);
  const secure = BASE_URL.startsWith('https://') ? '; Secure' : '';
  res.set('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure}`);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  const s = sessionFrom(req);
  if (s) db.prepare('DELETE FROM sessions WHERE token = ?').run(s.token);
  res.set('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => res.json({ signedIn: !!sessionFrom(req) }));

app.get('/api/admin/orders', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders ORDER BY date DESC').all().map(rowToOrder));
});
app.patch('/api/admin/orders/:id', requireAuth, (req, res) => {
  const status = str(req.body && req.body.status, 40);
  if (!ORDER_STATUS.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  const r = db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Order not found.' });
  res.json({ ok: true });
});
app.delete('/api/admin/orders/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/enquiries', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM enquiries ORDER BY date DESC').all().map(rowToEnquiry));
});
app.patch('/api/admin/enquiries/:id', requireAuth, (req, res) => {
  const status = str(req.body && req.body.status, 40);
  if (!ENQ_STATUS.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  const r = db.prepare(`UPDATE enquiries SET status = ? WHERE id = ?`).run(status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json({ ok: true });
});
app.delete('/api/admin/enquiries/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function validProduct(b) {
  if (!b) return null;
  const name = str(b.name, 160);
  const sizes = Array.isArray(b.sizes) ? b.sizes.map((s) => ({ label: str(s && s.label, 40), price: Math.round(Number(s && s.price) || 0) })).filter((s) => s.label && s.price > 0) : [];
  if (!name || !sizes.length) return null;
  return {
    id: str(b.id, 80) || uid('prod'), name, category: str(b.category, 60) || 'Interior',
    finish: str(b.finish, 60), tintable: !!b.tintable, desc: str(b.desc, 500),
    coverage: str(b.coverage, 80), sizes
  };
}
app.get('/api/admin/products', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY sort, name').all().map(rowToProduct));
});
app.post('/api/admin/products', requireAuth, (req, res) => {
  const p = validProduct(req.body);
  if (!p) return res.status(400).json({ error: 'A product needs a name and at least one size with a price.' });
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM products').get().m;
  saveProduct(p, maxSort + 1);
  res.status(201).json(p);
});
app.put('/api/admin/products/:id', requireAuth, (req, res) => {
  const p = validProduct(Object.assign({}, req.body, { id: req.params.id }));
  if (!p) return res.status(400).json({ error: 'A product needs a name and at least one size with a price.' });
  const existing = db.prepare('SELECT sort FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  saveProduct(p, existing.sort);
  res.json(p);
});
app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
app.post('/api/admin/products/reset', requireAuth, (req, res) => {
  db.prepare('DELETE FROM products').run();
  SEED_PRODUCTS.forEach((p, i) => saveProduct(p, i));
  res.json({ ok: true });
});

/* 404 for unknown API routes */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bella Paint running at http://localhost:${PORT}`);
  if (!PAYSTACK_SECRET) console.log('Paystack key not set — online payments disabled.');
  if (ADMIN_PASSWORD === 'bella-admin') console.log('WARNING: admin password is the default. Set ADMIN_PASSWORD before going live.');
});
