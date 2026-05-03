import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { seedProducts } from './app.js';

const file = path.resolve('data/db.json');
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, JSON.stringify({ users: [], sessions: {}, products: seedProducts, carts: {}, orders: [] }, null, 2));
console.log(`Seeded ${seedProducts.length} products to ${file}`);
