const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
let token = localStorage.getItem('shopenesia_token') || '';
let products = [];
let currentCategory = '';

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request gagal');
  return body;
}

function setAuthStatus(text) { document.getElementById('authStatus').textContent = text; }
function renderProducts(list) {
  document.getElementById('products').innerHTML = list.map(p => `
    <article class="product-card">
      <div class="product-emoji">${p.image}</div>
      <div class="product-body">
        <span class="badge">${p.badge}</span>
        <h3>${p.name}</h3>
        <div class="price">${rupiah(p.price)}</div>
        <div class="meta"><span>⭐ ${p.rating}</span><span>${p.sold.toLocaleString('id-ID')} terjual</span></div>
        <button onclick="addToCart('${p.id}')">Tambah Keranjang</button>
      </div>
    </article>`).join('');
}

function renderCategories(categories) {
  document.getElementById('categories').innerHTML = `<button class="chip" onclick="filterCategory('')">Semua</button>` + categories.map(c => `<button class="chip" onclick="filterCategory('${c}')">${c}</button>`).join('');
}

async function loadProducts(q = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (currentCategory) params.set('category', currentCategory);
  const data = await api(`/api/products?${params}`);
  products = data.products;
  renderProducts(products);
  renderCategories(data.categories);
}

window.filterCategory = async c => { currentCategory = c; await loadProducts(document.getElementById('searchInput').value); };
window.addToCart = async productId => {
  if (!token) return setAuthStatus('Daftar/login dulu sebelum menambahkan produk.');
  await api('/api/cart/items', { method:'POST', body:{ productId, qty:1 } });
  await loadCart(true);
};

async function loadCart(open = false) {
  if (!token) return;
  const { cart } = await api('/api/cart');
  document.getElementById('cartCount').textContent = cart.summary.itemCount;
  document.getElementById('cartItems').innerHTML = cart.items.length ? cart.items.map(i => `
    <div class="cart-item"><div>${i.image}</div><div><strong>${i.name}</strong><br><small>${i.qty} × ${rupiah(i.price)}</small></div><button class="secondary" onclick="removeItem('${i.id}')">Hapus</button></div>
  `).join('') : '<p class="muted">Keranjang masih kosong.</p>';
  document.getElementById('cartSummary').innerHTML = `
    <div><span>Item</span><strong>${cart.summary.itemCount}</strong></div>
    <div><span>Subtotal</span><strong>${rupiah(cart.summary.subtotal)}</strong></div>
    <div><span>Ongkir</span><strong>${rupiah(cart.summary.shipping)}</strong></div>
    <div><span>Biaya layanan</span><strong>${rupiah(cart.summary.serviceFee)}</strong></div>
    <div><span>Total</span><strong>${rupiah(cart.summary.total)}</strong></div>`;
  if (open) document.getElementById('drawer').classList.add('open');
}

window.removeItem = async id => { await api(`/api/cart/items/${id}`, { method:'DELETE' }); await loadCart(); };

document.getElementById('registerBtn').onclick = async () => {
  try {
    const body = { name:name.value, email:email.value, password:password.value };
    const data = await api('/api/auth/register', { method:'POST', body });
    token = data.token; localStorage.setItem('shopenesia_token', token);
    setAuthStatus(`Login sebagai ${data.user.name}`); await loadCart();
  } catch(e) { setAuthStatus(e.message); }
};
document.getElementById('loginBtn').onclick = async () => {
  try {
    const data = await api('/api/auth/login', { method:'POST', body:{ email:email.value, password:password.value } });
    token = data.token; localStorage.setItem('shopenesia_token', token);
    setAuthStatus(`Login sebagai ${data.user.name}`); await loadCart();
  } catch(e) { setAuthStatus(e.message); }
};
document.getElementById('checkoutBtn').onclick = async () => {
  try {
    const data = await api('/api/checkout', { method:'POST', body:{ address:address.value, paymentMethod:payment.value } });
    checkoutStatus.textContent = `Order ${data.order.id} berhasil dibuat!`;
    await loadCart();
  } catch(e) { checkoutStatus.textContent = e.message; }
};
document.getElementById('cartButton').onclick = () => { document.getElementById('drawer').classList.add('open'); loadCart(); };
document.getElementById('closeCart').onclick = () => document.getElementById('drawer').classList.remove('open');
document.getElementById('searchForm').onsubmit = async e => { e.preventDefault(); await loadProducts(searchInput.value); };

loadProducts();
if (token) { setAuthStatus('Token tersimpan. Keranjang siap digunakan.'); loadCart(); }
