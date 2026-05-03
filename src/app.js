import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_DATA_FILE = path.join(ROOT, 'data', 'db.json');

export const seedProducts = [
  { id: 'p-001', name: 'ShopeNesia Smartwatch S1', category: 'Elektronik', price: 249000, rating: 4.8, sold: 1240, stock: 50, image: 'assets/smartwatch.svg', badge: 'Flash Sale' },
  { id: 'p-002', name: 'Headphone Wireless Bass Pro', category: 'Elektronik', price: 189000, rating: 4.7, sold: 2180, stock: 42, image: 'assets/headphones.svg', badge: 'Terlaris' },
  { id: 'p-003', name: 'Tas Ransel Urban Daily', category: 'Fashion', price: 129000, rating: 4.6, sold: 980, stock: 35, image: 'assets/backpack.svg', badge: 'Gratis Ongkir' },
  { id: 'p-004', name: 'Sepatu Sneakers CloudStep', category: 'Fashion', price: 299000, rating: 4.9, sold: 1540, stock: 22, image: 'assets/sneakers.svg', badge: 'Promo' },
  { id: 'p-005', name: 'Rice Cooker Mini 1.2L', category: 'Rumah Tangga', price: 215000, rating: 4.8, sold: 760, stock: 18, image: 'assets/rice-cooker.svg', badge: 'Hemat' },
  { id: 'p-006', name: 'Skincare Bright Set', category: 'Kecantikan', price: 159000, rating: 4.7, sold: 3020, stock: 67, image: 'assets/skincare.svg', badge: 'Best Seller' },
  { id: 'p-007', name: 'Botol Minum Stainless 750ml', category: 'Olahraga', price: 79000, rating: 4.5, sold: 640, stock: 100, image: 'assets/bottle.svg', badge: 'Murah' },
  { id: 'p-008', name: 'Keyboard Mechanical Compact', category: 'Komputer', price: 399000, rating: 4.9, sold: 540, stock: 12, image: 'assets/keyboard.svg', badge: 'Limited' },
  { id: 'p-009', name: 'Lampu Meja LED Flexible', category: 'Rumah Tangga', price: 99000, rating: 4.6, sold: 860, stock: 44, image: 'assets/lamp.svg', badge: 'Diskon' },
  { id: 'p-010', name: 'Powerbank 20.000mAh Fast Charge', category: 'Elektronik', price: 229000, rating: 4.8, sold: 1790, stock: 33, image: 'assets/powerbank.svg', badge: 'Hot' }
];

function initialState() {
  return { users: [], sessions: {}, products: seedProducts, carts: {}, orders: [] };
}

function hashPassword(password, salt = crypto.randomBytes(12).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return hashPassword(password, salt).split(':')[1] === hash;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return null; }
}

function makeSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const shipping = subtotal > 0 ? (subtotal >= 250000 ? 0 : 15000) : 0;
  const serviceFee = subtotal > 0 ? 2500 : 0;
  return { itemCount, subtotal, shipping, serviceFee, total: subtotal + shipping + serviceFee };
}

export function createApp(options = {}) {
  const dataFile = options.dataFile ?? DEFAULT_DATA_FILE;
  let memory = initialState();

  async function load() {
    if (dataFile === ':memory:') return memory;
    if (!existsSync(dataFile)) {
      await mkdir(path.dirname(dataFile), { recursive: true });
      await writeFile(dataFile, JSON.stringify(initialState(), null, 2));
    }
    return JSON.parse(await readFile(dataFile, 'utf8'));
  }

  async function save(state) {
    if (dataFile === ':memory:') { memory = state; return; }
    await mkdir(path.dirname(dataFile), { recursive: true });
    await writeFile(dataFile, JSON.stringify(state, null, 2));
  }

  async function auth(req, state) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const userId = state.sessions[token];
    return userId ? state.users.find(u => u.id === userId) : null;
  }

  function expandCart(state, userId) {
    const raw = state.carts[userId] || [];
    const items = raw.map(i => {
      const product = state.products.find(p => p.id === i.productId);
      return product ? { ...product, qty: i.qty } : null;
    }).filter(Boolean);
    return { items, summary: makeSummary(items) };
  }

  async function serveStatic(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
    if (!filePath.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden' });
    try {
      const s = await stat(filePath);
      if (!s.isFile()) throw new Error('not file');
      const ext = path.extname(filePath);
      const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/html';
      res.writeHead(200, { 'content-type': `${contentType}; charset=utf-8` });
      createReadStream(filePath).pipe(res);
    } catch {
      json(res, 404, { error: 'Not found' });
    }
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);

    const state = await load();
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await parseBody(req) : {};
    if (body === null) return json(res, 400, { error: 'Invalid JSON' });

    try {
      if (req.method === 'GET' && url.pathname === '/api/products') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const category = url.searchParams.get('category');
        let products = state.products;
        if (q) products = products.filter(p => [p.name, p.category].join(' ').toLowerCase().includes(q));
        if (category) products = products.filter(p => p.category === category);
        return json(res, 200, { products, categories: [...new Set(state.products.map(p => p.category))] });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const { name, email, password } = body;
        if (!name || !email || !password || password.length < 6) return json(res, 422, { error: 'Name, email, and password min 6 chars are required' });
        if (state.users.some(u => u.email === email)) return json(res, 409, { error: 'Email already registered' });
        const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password) };
        const token = crypto.randomBytes(24).toString('hex');
        state.users.push(user); state.sessions[token] = user.id; state.carts[user.id] = [];
        await save(state);
        return json(res, 201, { token, user: { id: user.id, name, email } });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const { email, password } = body;
        const user = state.users.find(u => u.email === email);
        if (!user || !verifyPassword(password, user.passwordHash)) return json(res, 401, { error: 'Invalid credentials' });
        const token = crypto.randomBytes(24).toString('hex'); state.sessions[token] = user.id;
        await save(state);
        return json(res, 200, { token, user: { id: user.id, name: user.name, email } });
      }

      const user = await auth(req, state);
      if (!user) return json(res, 401, { error: 'Unauthorized' });

      if (req.method === 'GET' && url.pathname === '/api/cart') return json(res, 200, { cart: expandCart(state, user.id) });

      if (req.method === 'POST' && url.pathname === '/api/cart/items') {
        const { productId, qty = 1 } = body;
        const product = state.products.find(p => p.id === productId);
        if (!product) return json(res, 404, { error: 'Product not found' });
        const cart = state.carts[user.id] || (state.carts[user.id] = []);
        const existing = cart.find(i => i.productId === productId);
        if (existing) existing.qty = Math.min(product.stock, existing.qty + Number(qty));
        else cart.push({ productId, qty: Math.min(product.stock, Math.max(1, Number(qty))) });
        await save(state);
        return json(res, 200, { cart: expandCart(state, user.id) });
      }

      if (req.method === 'DELETE' && url.pathname.startsWith('/api/cart/items/')) {
        const productId = decodeURIComponent(url.pathname.split('/').pop());
        state.carts[user.id] = (state.carts[user.id] || []).filter(i => i.productId !== productId);
        await save(state);
        return json(res, 200, { cart: expandCart(state, user.id) });
      }

      if (req.method === 'POST' && url.pathname === '/api/checkout') {
        const { address, paymentMethod } = body;
        const cart = expandCart(state, user.id);
        if (!cart.items.length) return json(res, 422, { error: 'Cart is empty' });
        if (!address || !paymentMethod) return json(res, 422, { error: 'Address and payment method are required' });
        const order = { id: `SN-${Date.now()}`, userId: user.id, items: cart.items, summary: cart.summary, address, paymentMethod, status: 'created', createdAt: new Date().toISOString() };
        state.orders.unshift(order); state.carts[user.id] = [];
        await save(state);
        return json(res, 201, { order });
      }

      json(res, 404, { error: 'Not found' });
    } catch (error) {
      json(res, 500, { error: 'Server error', detail: error.message });
    }
  };
}

export function createTestClient(handler) {
  return {
    async request(method, url, body, token) {
      const server = createServer(handler);
      await new Promise(resolve => server.listen(0, resolve));
      const { port } = server.address();
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await fetch(`http://127.0.0.1:${port}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const jsonBody = await res.json();
      await new Promise(resolve => server.close(resolve));
      return { status: res.status, body: jsonBody };
    },
    get(url, token) { return this.request('GET', url, undefined, token); },
    post(url, body, token) { return this.request('POST', url, body, token); },
    delete(url, token) { return this.request('DELETE', url, undefined, token); }
  };
}
