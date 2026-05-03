import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find(item => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const input = arg('input');
const output = arg('output', 'reports/output.pdf');
const format = arg('format', 'A4');

if (!input) {
  console.error('Usage: node scripts/html-to-pdf.js --input=path-or-url --output=reports/file.pdf');
  process.exit(1);
}

const target = /^https?:\/\//i.test(input)
  ? input
  : pathToFileURL(path.resolve(input)).href;
const outFile = path.resolve(output);

await fs.mkdir(path.dirname(outFile), { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.goto(target, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.pdf({
    path: outFile,
    format,
    printBackground: true,
    margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
  });
  console.log(outFile);
} finally {
  await browser.close();
}
