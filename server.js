const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme123';
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

const PAYMENT_INFO = {
  method: 'Mobile Money',
  number: '0889554715',
  name: 'Randy Drakey Tomanee Jr.',
};

app.use(express.json());

// ---- Products ----
// category groups products on the storefront. Prices below are placeholders —
// edit them (and names/categories) directly in this file to match reality.
const PRODUCTS = [
  // Wall Panels
  { id: 'fluted-black', category: 'Wall Panels', name: 'Fluted Panel — Matte Black', price: 145, unit: 'per panel (2.4m)', image: '/fluted-black.jpg' },
  { id: 'channel-warm', category: 'Wall Panels', name: 'Backlit Channel Panel — Warm Oak', price: 160, unit: 'per panel (2.4m)', image: '/channel-warm.jpg' },
  { id: 'slat-charcoal', category: 'Wall Panels', name: 'Slat Panel — Charcoal Ribbed', price: 155, unit: 'per panel (2.4m)', image: '/slat-charcoal.jpg' },
  { id: 'gold-inlay', category: 'Wall Panels', name: 'Marble & Gold Inlay Panel', price: 210, unit: 'per panel (2.4m)', image: '/gold-inlay.jpg' },
  { id: 'panel-black-stone', category: 'PU Stone', name: 'PU Stone Feature Wall — Charcoal', price: 175, unit: 'per panel (2.4m)', image: '/panel-black-stone.jpg' },
  { id: 'panel-slat-pendant', category: 'Wall Panels', name: 'Slat Panel — Warm Walnut', price: 165, unit: 'per panel (2.4m)', image: '/panel-slat-pendant.jpg' },
  { id: 'panel-fluted-marble', category: 'Wall Panels', name: 'Fluted Panel with Marble Inlay', price: 195, unit: 'per panel (2.4m)', image: '/panel-fluted-marble.jpg' },
  { id: 'panel-mirror-strips', category: 'UV Sheet', name: 'UV Mirror-Strip Panel — Glossy White', price: 220, unit: 'per panel (2.4m)', image: '/panel-mirror-strips.jpg' },
  { id: 'panel-gold-marble', category: 'PU Stone', name: 'Marble & Brushed Gold Panel', price: 230, unit: 'per panel (2.4m)', image: '/panel-gold-marble.jpg' },
  { id: 'panel-floating-black', category: 'UV Sheet', name: 'UV Gloss Panel — Midnight Black', price: 240, unit: 'per panel (2.4m)', image: '/panel-floating-black.jpg' },
  { id: 'panel-dark-marble', category: 'PU Stone', name: 'PU Stone Panel — Dark Veined Marble', price: 200, unit: 'per panel (2.4m)', image: '/panel-dark-marble.jpg' },
  { id: 'panel-modern-grey', category: 'Wall Panels', name: 'Panel Wall — Soft Grey Two-Tone', price: 150, unit: 'per panel (2.4m)', image: '/panel-modern-grey.jpg' },
  // Gypsum Board / Ceiling
  { id: 'ceiling-cove-grey', category: 'Gypsum Board', name: 'Gypsum Cove Ceiling — Grey Accent', price: 120, unit: 'per sqm installed', image: '/ceiling-cove-grey.jpg' },
  { id: 'ceiling-strip-plants', category: 'Gypsum Board', name: 'Gypsum Strip Ceiling — Warm Wood', price: 110, unit: 'per sqm installed', image: '/ceiling-strip-plants.jpg' },
  { id: 'ceiling-cove-blue', category: 'Gypsum Board', name: 'Gypsum Cove Ceiling — Boxed Frame', price: 130, unit: 'per sqm installed', image: '/ceiling-cove-blue.jpg' },
  { id: 'ceiling-square-gold', category: 'Gypsum Board', name: 'Gypsum Ceiling — Gold Strip Feature', price: 140, unit: 'per sqm installed', image: '/ceiling-square-gold.jpg' },
  { id: 'ceiling-ring-light', category: 'Gypsum Board', name: 'Gypsum Ceiling — Layered Ring Light', price: 150, unit: 'per sqm installed', image: '/ceiling-ring-light.jpg' },
];

const PUBLIC_FILES = [
  'index.html', 'admin.html', 'track.html',
  'fluted-black.jpg', 'channel-warm.jpg', 'slat-charcoal.jpg', 'gold-inlay.jpg',
  'panel-black-stone.jpg', 'panel-slat-pendant.jpg', 'panel-fluted-marble.jpg',
  'panel-mirror-strips.jpg', 'panel-gold-marble.jpg', 'panel-floating-black.jpg',
  'panel-dark-marble.jpg', 'panel-modern-grey.jpg',
  'ceiling-cove-grey.jpg', 'ceiling-strip-plants.jpg', 'ceiling-cove-blue.jpg',
  'ceiling-square-gold.jpg', 'ceiling-ring-light.jpg',
];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
PUBLIC_FILES.forEach((file) => {
  app.get('/' + file, (req, res) => res.sendFile(path.join(__dirname, file)));
});

// ---- Helpers ----
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function checkAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
function generateOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DS-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---- Products ----
app.get('/api/products', (req, res) => res.json(PRODUCTS));

// ---- Payment info ----
app.get('/api/payment-info', (req, res) => res.json(PAYMENT_INFO));

// ---- Orders ----
app.post('/api/orders', (req, res) => {
  const { items, customerName, customerPhone, customerNote } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in order' });
  }

  let total = 0;
  const lineItems = items.map((it) => {
    const p = PRODUCTS.find((pr) => pr.id === it.id);
    if (!p) return null;
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    total += p.price * qty;
    return { id: p.id, name: p.name, price: p.price, qty };
  }).filter(Boolean);

  if (lineItems.length === 0) {
    return res.status(400).json({ error: 'No valid items in order' });
  }

  const orders = readJSON(ORDERS_FILE);
  let code;
  do { code = generateOrderCode(); } while (orders.some((o) => o.code === code));

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    code,
    createdAt: new Date().toISOString(),
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    customerNote: customerNote || '',
    items: lineItems,
    total,
    status: 'awaiting payment',
  };

  orders.unshift(order);
  writeJSON(ORDERS_FILE, orders);

  res.json({ success: true, order, paymentInfo: PAYMENT_INFO });
});

// Admin: list all orders
app.get('/api/orders', checkAdmin, (req, res) => {
  res.json(readJSON(ORDERS_FILE));
});

// Admin: update an order's status
app.patch('/api/orders/:id', checkAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.body.status) order.status = req.body.status;
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true, order });
});

// Public: track an order by its code (no login needed, just the code — like a parcel tracking number)
app.get('/api/track/:code', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const order = orders.find((o) => o.code.toUpperCase() === req.params.code.toUpperCase());
  if (!order) return res.status(404).json({ error: 'No order found with that code' });
  res.json({
    code: order.code,
    createdAt: order.createdAt,
    items: order.items,
    total: order.total,
    status: order.status,
  });
});

// ---- Reviews ----
app.get('/api/reviews', (req, res) => {
  res.json(readJSON(REVIEWS_FILE));
});

app.post('/api/reviews', (req, res) => {
  const { name, rating, comment } = req.body || {};
  const r = Math.round(Number(rating));
  if (!name || !r || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Name and a rating from 1-5 are required' });
  }
  const review = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: String(name).slice(0, 60),
    rating: r,
    comment: String(comment || '').slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  const reviews = readJSON(REVIEWS_FILE);
  reviews.unshift(review);
  writeJSON(REVIEWS_FILE, reviews);
  res.json({ success: true, review });
});

app.listen(PORT, () => {
  console.log(`Dream Space server running on port ${PORT}`);
});
