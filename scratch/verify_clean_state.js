const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('=== VERIFYING API ENDPOINTS ON CLEAN DATABASE ===\n');

  // 1. Dashboard
  const dashRes = await request({ hostname: 'localhost', port: 5000, path: '/api/dashboard', method: 'GET' });
  console.log('GET /api/dashboard:', dashRes.status, dashRes.data?.totals);
  if (dashRes.status !== 200) throw new Error('Dashboard returned ' + dashRes.status);

  // 2. Products
  const prodRes = await request({ hostname: 'localhost', port: 5000, path: '/api/products', method: 'GET' });
  console.log('GET /api/products:', prodRes.status, 'items:', prodRes.data?.length);
  if (prodRes.status !== 200 || !Array.isArray(prodRes.data)) throw new Error('Products failed');

  // 3. Suppliers
  const suppRes = await request({ hostname: 'localhost', port: 5000, path: '/api/suppliers', method: 'GET' });
  console.log('GET /api/suppliers:', suppRes.status, 'items:', suppRes.data?.length);
  if (suppRes.status !== 200 || !Array.isArray(suppRes.data)) throw new Error('Suppliers failed');

  // 4. Bills
  const billsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/bills', method: 'GET' });
  console.log('GET /api/bills:', billsRes.status, 'items:', billsRes.data?.length);
  if (billsRes.status !== 200 || !Array.isArray(billsRes.data)) throw new Error('Bills failed');

  // 5. Stock history
  const stockRes = await request({ hostname: 'localhost', port: 5000, path: '/api/stock/history', method: 'GET' });
  console.log('GET /api/stock/history:', stockRes.status, 'items:', stockRes.data?.length);
  if (stockRes.status !== 200) throw new Error('Stock history failed');

  // 6. Reports
  const rSales = await request({ hostname: 'localhost', port: 5000, path: '/api/reports/sales', method: 'GET' });
  console.log('GET /api/reports/sales:', rSales.status, 'summary:', rSales.data?.summary);
  if (rSales.status !== 200) throw new Error('Reports sales failed');

  const rStock = await request({ hostname: 'localhost', port: 5000, path: '/api/reports/stock', method: 'GET' });
  console.log('GET /api/reports/stock:', rStock.status, 'rows:', rStock.data?.rows?.length);
  if (rStock.status !== 200) throw new Error('Reports stock failed');

  // 7. Settings
  const setRes = await request({ hostname: 'localhost', port: 5000, path: '/api/settings', method: 'GET' });
  console.log('GET /api/settings:', setRes.status, 'Business Name:', setRes.data?.business_name);
  if (setRes.status !== 200 || setRes.data?.business_name !== 'G - TECHNOLOGIES') {
    throw new Error('Settings verification failed');
  }

  console.log('\n✓ ALL CLEAN-STATE API ENDPOINTS PASSED WITH ZERO 500 ERRORS!\n');

  console.log('=== VERIFYING POST-RESET FIRST TRANSACTION WORKFLOW ===\n');

  // 1. Add FIRST supplier
  const s1 = await request(
    { hostname: 'localhost', port: 5000, path: '/api/suppliers', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { name: 'Apex Electronics Salem', contact_person: 'Ramesh K', phone: '9443322110', email: 'apex@example.com', address: 'Salem' }
  );
  console.log('1. First Supplier created -> ID:', s1.data?.id, 'Name:', s1.data?.name);
  if (s1.data?.id !== 1) throw new Error('Expected Supplier ID 1, got ' + s1.data?.id);

  // 2. Add FIRST product
  const p1 = await request(
    { hostname: 'localhost', port: 5000, path: '/api/products', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Dell Laptop Motherboard i5 11th Gen',
      sku: 'MB-DELL-115',
      category: 'Electronics',
      unit: 'pcs',
      hsn_code: '8473',
      gst_rate: 18,
      purchase_price: 4500,
      selling_price: 6500,
      minimum_stock: 3,
      current_stock: 0,
      supplier_id: 1,
    }
  );
  console.log('2. First Product created -> ID:', p1.data?.id, 'Name:', p1.data?.name, 'SKU:', p1.data?.sku);
  if (p1.data?.id !== 1) throw new Error('Expected Product ID 1, got ' + p1.data?.id);

  // 3. Add stock using Stock In
  const stockInRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/stock/in', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { product_id: 1, quantity: 10, reason: 'Purchase from Apex', notes: 'Batch #001' }
  );
  console.log('3. Stock In 10 units -> Current Stock:', stockInRes.data?.product?.current_stock);
  if (stockInRes.data?.product?.current_stock !== 10) throw new Error('Expected current stock 10');

  // 4. Billing search
  const searchRes = await request({ hostname: 'localhost', port: 5000, path: '/api/products?search=Dell', method: 'GET' });
  console.log('4. Billing search "Dell" -> matches:', searchRes.data?.length, searchRes.data?.[0]?.name);
  if (searchRes.data?.length !== 1) throw new Error('Expected 1 search match');

  // 5. Generate FIRST bill
  const bill1 = await request(
    { hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      customer_name: 'Anand Kumar',
      customer_phone: '9842100000',
      items: [
        {
          product_id: 1,
          product_name: 'Dell Laptop Motherboard i5 11th Gen',
          quantity: 2,
          unit_price: 6500,
          discount: 0,
        },
      ],
      payment_method: 'UPI / GPay',
      status: 'Paid',
    }
  );
  console.log('5. First Bill created -> ID:', bill1.data?.id, 'Invoice #:', bill1.data?.invoice_number, 'Grand Total: ₹', bill1.data?.grand_total || bill1.data?.total);
  if (bill1.data?.id !== 1) throw new Error('Expected Bill ID 1');

  // 6. Verify stock decreased
  const p1Updated = await request({ hostname: 'localhost', port: 5000, path: '/api/products/1', method: 'GET' });
  console.log('6. Product stock after sale of 2 units -> Stock:', p1Updated.data?.current_stock);
  if (p1Updated.data?.current_stock !== 8) throw new Error('Expected stock to decrease to 8, got ' + p1Updated.data?.current_stock);

  // 7. Open reports
  const rSalesAfter = await request({ hostname: 'localhost', port: 5000, path: '/api/reports/sales', method: 'GET' });
  console.log('7. Sales report after bill -> Total Orders:', rSalesAfter.data?.summary?.bill_count, 'Total Sales: ₹', rSalesAfter.data?.summary?.total_sales);

  // 8. Test edit product
  const p1Edit = await request(
    { hostname: 'localhost', port: 5000, path: '/api/products/1', method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Dell Laptop Motherboard i5 11th Gen (OEM)',
      sku: 'MB-DELL-115',
      category: 'Electronics',
      unit: 'pcs',
      purchase_price: 4600,
      selling_price: 6800,
      minimum_stock: 3,
    }
  );
  console.log('8. Product Edit -> Updated Name:', p1Edit.data?.name);

  // 9. Test safe archive on billed product
  const delBilled = await request({ hostname: 'localhost', port: 5000, path: '/api/products/1', method: 'DELETE' });
  console.log('9. Delete Billed Product -> Action:', delBilled.data?.action, 'Message:', delBilled.data?.message);
  if (delBilled.data?.action !== 'archived') throw new Error('Expected safe archive');

  console.log('\n=============================================================');
  console.log('ALL WORKFLOW VERIFICATIONS PASSED 100%!');
  console.log('=============================================================\n');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
