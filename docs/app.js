const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const products = [
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
let cart = JSON.parse(localStorage.getItem('shopenesia_demo_cart') || '[]');
let currentCategory = '';
let loggedIn = localStorage.getItem('shopenesia_demo_login') === 'true';

function saveCart(){ localStorage.setItem('shopenesia_demo_cart', JSON.stringify(cart)); }
function summary(){
  const itemCount = cart.reduce((s,i)=>s+i.qty,0);
  const subtotal = cart.reduce((s,i)=>s+(products.find(p=>p.id===i.productId)?.price||0)*i.qty,0);
  const shipping = subtotal ? (subtotal >= 250000 ? 0 : 15000) : 0;
  const serviceFee = subtotal ? 2500 : 0;
  return { itemCount, subtotal, shipping, serviceFee, total: subtotal + shipping + serviceFee };
}
function setAuthStatus(text){ document.getElementById('authStatus').textContent = text; }
function filteredProducts(q=''){
  return products.filter(p => (!currentCategory || p.category === currentCategory) && (!q || `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())));
}
function renderProducts(list){
  document.getElementById('products').innerHTML = list.map(p => `
    <article class="product-card">
      <div class="product-emoji"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
      <div class="product-body">
        <span class="badge">${p.badge}</span><h3>${p.name}</h3>
        <div class="price">${rupiah(p.price)}</div>
        <div class="meta"><span>⭐ ${p.rating}</span><span>${p.sold.toLocaleString('id-ID')} terjual</span></div>
        <button onclick="addToCart('${p.id}')">Tambah Keranjang</button>
      </div>
    </article>`).join('');
}
function renderCategories(){
  const categories = [...new Set(products.map(p => p.category))];
  document.getElementById('categories').innerHTML = `<button class="chip" onclick="filterCategory('')">Semua</button>` + categories.map(c => `<button class="chip" onclick="filterCategory('${c}')">${c}</button>`).join('');
}
function loadProducts(){ renderProducts(filteredProducts(document.getElementById('searchInput').value)); renderCategories(); }
window.filterCategory = c => { currentCategory = c; loadProducts(); };
window.addToCart = id => {
  if(!loggedIn) return setAuthStatus('Klik Daftar/Login Demo dulu sebelum menambahkan produk.');
  const found = cart.find(i=>i.productId===id); found ? found.qty++ : cart.push({productId:id,qty:1});
  saveCart(); loadCart(true);
};
window.removeItem = id => { cart = cart.filter(i=>i.productId!==id); saveCart(); loadCart(); };
function loadCart(open=false){
  const s = summary(); document.getElementById('cartCount').textContent = s.itemCount;
  document.getElementById('cartItems').innerHTML = cart.length ? cart.map(i => {
    const p = products.find(p=>p.id===i.productId);
    return `<div class="cart-item"><div><img class="cart-thumb" src="${p.image}" alt="${p.name}"></div><div><strong>${p.name}</strong><br><small>${i.qty} × ${rupiah(p.price)}</small></div><button class="secondary" onclick="removeItem('${p.id}')">Hapus</button></div>`;
  }).join('') : '<p class="muted">Keranjang masih kosong.</p>';
  document.getElementById('cartSummary').innerHTML = `<div><span>Item</span><strong>${s.itemCount}</strong></div><div><span>Subtotal</span><strong>${rupiah(s.subtotal)}</strong></div><div><span>Ongkir</span><strong>${rupiah(s.shipping)}</strong></div><div><span>Biaya layanan</span><strong>${rupiah(s.serviceFee)}</strong></div><div><span>Total</span><strong>${rupiah(s.total)}</strong></div>`;
  if(open) document.getElementById('drawer').classList.add('open');
}
document.getElementById('registerBtn').onclick = document.getElementById('loginBtn').onclick = () => { loggedIn = true; localStorage.setItem('shopenesia_demo_login','true'); setAuthStatus(`Login demo sebagai ${document.getElementById('name').value}`); };
document.getElementById('checkoutBtn').onclick = () => { const s=summary(); if(!s.itemCount) return checkoutStatus.textContent='Keranjang kosong.'; cart=[]; saveCart(); loadCart(); checkoutStatus.textContent=`Order demo SN-${Date.now()} berhasil dibuat!`; };
document.getElementById('cartButton').onclick = () => { document.getElementById('drawer').classList.add('open'); loadCart(); };
document.getElementById('closeCart').onclick = () => document.getElementById('drawer').classList.remove('open');
document.getElementById('searchForm').onsubmit = e => { e.preventDefault(); loadProducts(); };
if(loggedIn) setAuthStatus('Login demo aktif. Keranjang disimpan di browser.');
loadProducts(); loadCart();
