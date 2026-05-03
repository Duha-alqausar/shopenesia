# ShopeNesia

ShopeNesia adalah marketplace/e-commerce demo fullstack dengan brand fiktif. Fitur:

- Auth register/login berbasis token
- Katalog produk + search + filter kategori
- Keranjang belanja
- Checkout dan penyimpanan order
- Frontend responsif HTML/CSS/JS
- Backend REST API Node.js tanpa dependency eksternal
- Database JSON lokal di `data/db.json`

## Menjalankan

```bash
npm install
npm run seed
npm start
```

Buka: http://localhost:3000

## Test

```bash
npm test
```

## API Utama

- `GET /api/products`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/:productId`
- `POST /api/checkout`
