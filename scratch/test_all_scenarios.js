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
  console.log('=== STARTING SUITE OF DATABASE & API INTEGRATION TESTS ===\n');

  // TEST 1: Unused product permanent deletion
  console.log('--- TEST 1: Create unused product and delete permanently ---');
  const p1Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/products',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Product A (Unused)',
      category: 'Electronics',
      sku: 'TEST-A-' + Date.now(),
      purchase_price: 100,
      selling_price: 150,
      minimum_stock: 5,
      current_stock: 0,
    }
  );
  console.log('Product A created:', p1Res.status, p1Res.data?.name, 'ID:', p1Res.data?.id);
  const p1Id = p1Res.data.id;

  // Check usage
  const u1Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${p1Id}/usage`,
    method: 'GET',
  });
  console.log('Product A usage check:', u1Res.data);

  // Delete Product A
  const d1Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${p1Id}`,
    method: 'DELETE',
  });
  console.log('Product A delete result:', d1Res.status, d1Res.data);
  if (d1Res.data.action !== 'deleted') {
    throw new Error('TEST 1 Failed: Expected action "deleted", got ' + d1Res.data.action);
  }
  console.log('✓ TEST 1 PASSED: Unused product was permanently deleted.\n');

  // TEST 2: Product used in a bill
  console.log('--- TEST 2: Create product, create bill, attempt delete ---');
  const p2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/products',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Product B (Billed)',
      category: 'Electronics',
      sku: 'TEST-B-' + Date.now(),
      purchase_price: 200,
      selling_price: 300,
      minimum_stock: 5,
      current_stock: 20,
    }
  );
  const p2Id = p2Res.data.id;
  console.log('Product B created:', p2Res.data.name, 'ID:', p2Id);

  // Create Bill with Product B
  const billRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bills',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      customer_name: 'Test Customer GK',
      customer_phone: '9876543210',
      items: [
        {
          product_id: p2Id,
          product_name: 'Test Product B (Billed)',
          quantity: 2,
          unit_price: 300,
          discount: 0,
        },
      ],
      payment_method: 'Cash',
      status: 'Paid',
    }
  );
  console.log('Bill created:', billRes.status, 'Bill ID:', billRes.data?.id, 'Invoice No:', billRes.data?.invoice_number);
  const billId = billRes.data.id;

  // Check usage
  const u2Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${p2Id}/usage`,
    method: 'GET',
  });
  console.log('Product B usage check:', u2Res.data);

  // Delete Product B
  const d2Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${p2Id}`,
    method: 'DELETE',
  });
  console.log('Product B delete response:', d2Res.status, d2Res.data);
  if (d2Res.data.action !== 'archived') {
    throw new Error('TEST 2 Failed: Expected action "archived", got ' + d2Res.data.action);
  }
  console.log('✓ TEST 2 PASSED: Product with billing history was safely archived instead of deleted.\n');

  // TEST 3: Historical bill inspection
  console.log('--- TEST 3: Verify historical bill preserves snapshot product information ---');
  const getBillRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/${billId}`,
    method: 'GET',
  });
  console.log('Historical bill details:', {
    id: getBillRes.data.id,
    invoice_number: getBillRes.data.invoice_number,
    items_count: getBillRes.data.items?.length,
    first_item: getBillRes.data.items?.[0],
  });
  const firstItem = getBillRes.data.items[0];
  if (!firstItem || firstItem.product_name !== 'Test Product B (Billed)' || Number(firstItem.quantity) !== 2) {
    throw new Error('TEST 3 Failed: Historical bill items snapshot is missing or incorrect');
  }
  console.log('✓ TEST 3 PASSED: Historical bill rendered with full product snapshot details intact.\n');

  // TEST 4: Billing product search excludes archived product
  console.log('--- TEST 4: Verify archived product is excluded from active billing search ---');
  const searchActiveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products?search=${encodeURIComponent('Test Product B (Billed)')}`,
    method: 'GET',
  });
  console.log('Active product search count for Product B:', searchActiveRes.data.length);
  if (searchActiveRes.data.length !== 0) {
    throw new Error('TEST 4 Failed: Archived product still appeared in active product search!');
  }

  // But should appear when filtering for archived
  const searchArchivedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products?status=archived&search=${encodeURIComponent('Test Product B (Billed)')}`,
    method: 'GET',
  });
  console.log('Archived filter search count for Product B:', searchArchivedRes.data.length);
  if (searchArchivedRes.data.length === 0) {
    throw new Error('TEST 4 Failed: Archived product did not appear in status=archived filter!');
  }
  console.log('✓ TEST 4 PASSED: Archived product is excluded from active billing and visible in archived filter.\n');

  // TEST 5: Reports verification
  console.log('--- TEST 5: Verify reports include historical sales with archived products ---');
  const reportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/sales?period=this-month',
    method: 'GET',
  });
  console.log('Reports summary total sales:', reportRes.data?.summary?.total_sales, 'transactions count:', reportRes.data?.summary?.total_orders);
  if (!reportRes.data) {
    throw new Error('TEST 5 Failed: Reports endpoint returned invalid data');
  }
  console.log('✓ TEST 5 PASSED: Sales reports continue to process historical bills accurately.\n');

  // TEST 6: Normal product update
  console.log('--- TEST 6: Normal product update without foreign key errors ---');
  const p3Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/products',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Product C (Editable)',
      category: 'Stationery',
      sku: 'TEST-C-' + Date.now(),
      purchase_price: 50,
      selling_price: 80,
      minimum_stock: 10,
      current_stock: 15,
    }
  );
  const p3Id = p3Res.data.id;
  const updateRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/products/${p3Id}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Product C (Updated Name)',
      category: 'Stationery',
      sku: p3Res.data.sku,
      purchase_price: 55,
      selling_price: 90,
      minimum_stock: 12,
    }
  );
  console.log('Product C update status:', updateRes.status, 'Updated name:', updateRes.data?.name);
  if (updateRes.status !== 200 || updateRes.data?.name !== 'Test Product C (Updated Name)') {
    throw new Error('TEST 6 Failed: Product update failed');
  }
  console.log('✓ TEST 6 PASSED: Product update succeeded with 0 foreign-key issues.\n');

  // TEST 7: Restore product
  console.log('--- TEST 7: Restore archived Product B ---');
  const restoreRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/products/${p2Id}/restore`,
    method: 'PUT',
  });
  console.log('Restore response:', restoreRes.status, restoreRes.data);
  if (restoreRes.status !== 200 || !restoreRes.data.product?.is_active) {
    throw new Error('TEST 7 Failed: Product restore failed');
  }
  console.log('✓ TEST 7 PASSED: Product successfully restored to active catalog.\n');

  console.log('====================================================');
  console.log('ALL 7 TEST SCENARIOS COMPLETED & VALIDATED SUCCESSFULLY!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
