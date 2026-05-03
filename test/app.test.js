import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, createTestClient } from '../src/app.js';

const client = () => createTestClient(createApp({ dataFile: ':memory:' }));

test('GET /api/products returns seeded product catalog', async () => {
  const api = client();
  const res = await api.get('/api/products');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.products));
  assert.ok(res.body.products.length >= 8);
  assert.ok(res.body.products[0].id);
  assert.ok(res.body.products[0].name);
});

test('auth, cart, and checkout flow works end-to-end', async () => {
  const api = client();

  const register = await api.post('/api/auth/register', {
    name: 'Duha',
    email: 'duha@example.com',
    password: 'secret123'
  });
  assert.equal(register.status, 201);
  assert.ok(register.body.token);

  const products = await api.get('/api/products');
  const product = products.body.products[0];

  const add = await api.post('/api/cart/items', {
    productId: product.id,
    qty: 2
  }, register.body.token);
  assert.equal(add.status, 200);
  assert.equal(add.body.cart.items[0].qty, 2);
  assert.equal(add.body.cart.summary.itemCount, 2);

  const checkout = await api.post('/api/checkout', {
    address: 'Jakarta, Indonesia',
    paymentMethod: 'COD'
  }, register.body.token);
  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.order.status, 'created');
  assert.equal(checkout.body.order.items.length, 1);
  assert.equal(checkout.body.order.summary.itemCount, 2);

  const cart = await api.get('/api/cart', register.body.token);
  assert.equal(cart.body.cart.items.length, 0);
});

test('protected routes reject unauthenticated requests', async () => {
  const api = client();
  const res = await api.get('/api/cart');
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Unauthorized');
});
