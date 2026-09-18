const http = require('http');

const endpoints = [
  '/api/health',
  '/api/dashboard',
  '/api/products',
  '/api/suppliers',
  '/api/bills',
  '/api/stock/history',
  '/api/reports/stock',
  '/api/reports/low-stock',
  '/api/reports/out-of-stock',
  '/api/reports/sales',
  '/api/settings',
];

async function check() {
  console.log('=== API HEALTH & CLEAN ENDPOINT CHECKS ===');
  for (const ep of endpoints) {
    await new Promise((resolve) => {
      http
        .get('http://localhost:5000' + ep, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
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
