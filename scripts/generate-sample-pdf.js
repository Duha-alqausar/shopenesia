import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'reports');
const outFile = path.join(outDir, 'shopenesia-sample-report.pdf');

const rupiah = n => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(n);

const products = [
  ['ShopeNesia Smartwatch S1', 249000, 1240, 4.8],
  ['Headphone Wireless Bass Pro', 189000, 2180, 4.7],
  ['Tas Ransel Urban Daily', 129000, 980, 4.6],
  ['Sepatu Sneakers CloudStep', 299000, 1540, 4.9],
  ['Rice Cooker Mini 1.2L', 215000, 760, 4.8],
];

const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>ShopeNesia Sample PDF Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; margin: 0; color: #111827; background: #fff7ed; }
    .page { padding: 42px; }
    .hero { background: linear-gradient(135deg, #f97316, #fb923c); color: white; border-radius: 28px; padding: 32px; }
    .eyebrow { text-transform: uppercase; letter-spacing: .16em; font-size: 11px; opacity: .85; margin: 0 0 10px; }
    h1 { font-size: 34px; margin: 0 0 10px; line-height: 1.08; }
    .hero p:last-child { margin-bottom: 0; max-width: 620px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 22px 0; }
    .card { background: white; border: 1px solid #fed7aa; border-radius: 18px; padding: 18px; box-shadow: 0 12px 28px rgba(124,45,18,.08); }
    .label { color: #6b7280; font-size: 12px; margin-bottom: 8px; }
    .metric { font-size: 22px; font-weight: 800; color: #ea580c; }
    h2 { margin: 30px 0 12px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; }
    th { background: #111827; color: white; text-align: left; padding: 12px; font-size: 12px; }
    td { border-bottom: 1px solid #ffedd5; padding: 12px; font-size: 12px; }
    tr:last-child td { border-bottom: 0; }
    .note { margin-top: 24px; background: white; border-left: 5px solid #f97316; padding: 16px; border-radius: 14px; line-height: 1.5; }
    .footer { margin-top: 28px; color: #6b7280; font-size: 11px; }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">PDF Generator Test</p>
      <h1>ShopeNesia Marketplace Report</h1>
      <p>Contoh PDF otomatis yang dibuat dari HTML/CSS menggunakan Puppeteer headless Chrome. Format ini bisa dipakai untuk report SEO, Meta Ads, invoice, proposal, atau dashboard export.</p>
    </section>

    <section class="grid">
      <div class="card"><div class="label">Produk Aktif</div><div class="metric">10</div></div>
      <div class="card"><div class="label">Total Terjual</div><div class="metric">13.5k</div></div>
      <div class="card"><div class="label">Avg Rating</div><div class="metric">4.7</div></div>
      <div class="card"><div class="label">Estimasi GMV</div><div class="metric">${rupiah(284500000)}</div></div>
    </section>

    <h2>Top Produk</h2>
    <table>
      <thead><tr><th>Produk</th><th>Harga</th><th>Terjual</th><th>Rating</th></tr></thead>
      <tbody>
        ${products.map(([name, price, sold, rating]) => `<tr><td>${name}</td><td>${rupiah(price)}</td><td>${sold.toLocaleString('id-ID')}</td><td>${rating}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="note"><strong>Siap dipakai:</strong> pipeline PDF sudah berjalan. Berikutnya kita bisa bikin template report Meta Ads, SEO Looker Studio, invoice order, atau proposal otomatis dengan desain HTML yang lebih bebas.</div>
    <div class="footer">Generated at ${new Date().toLocaleString('id-ID')} by Hermes Agent + Puppeteer.</div>
  </main>
</body>
</html>`;

await fs.mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });
  console.log(outFile);
} finally {
  await browser.close();
}
