const http = require('http');

const endpoints = [
  '/',
  '/health',
  '/api/health',
  '/products',
  '/api/products',
  '/suppliers',
  '/api/suppliers',
  '/dashboard',
  '/api/dashboard',
  '/stock/history?type=all',
  '/api/stock/history?type=all',
  '/reports/low-stock',
  '/api/reports/low-stock',
];

async function check() {
  console.log('=== TESTING DUAL-MOUNT ROUTING ON LOCAL EXPRESS ===');
  for (const ep of endpoints) {
    await new Promise((resolve) => {
      http
        .get('http://localhost:5000' + ep, (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => {
            console.log(`[HTTP ${res.statusCode}] ${ep}`);
            resolve();
          });
        })
        .on('error', (e) => {
          console.log(`[ERROR] ${ep}: ${e.message}`);
          resolve();
        });
    });
  }
}

check();
