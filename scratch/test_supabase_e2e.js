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

async function runTest() {
  console.log('=====================================================');
  console.log('STARTING END-TO-END SUPABASE POSTGRESQL BUSINESS FLOW');
  console.log('=====================================================\n');

  // 1. Health & initial empty endpoints
  const h = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('1. API Health check:', h.status, h.data);
  if (h.status !== 200) throw new Error('Health check failed');

  const dash = await request({ hostname: 'localhost', port: 5000, path: '/api/dashboard', method: 'GET' });
  console.log('2. Dashboard on clean Supabase DB:', dash.status, dash.data?.totals);
  if (dash.status !== 200) throw new Error('Dashboard endpoint failed');

  const settingsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/settings', method: 'GET' });
  console.log('3. Settings on Supabase DB:', settingsRes.status, 'Business:', settingsRes.data?.business_name, 'Phone:', settingsRes.data?.phone);
  if (settingsRes.data?.business_name !== 'G - TECHNOLOGIES') throw new Error('Settings business_name incorrect');

  // 4. Create Supplier
  const supRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/suppliers', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'G-Tech Components Chennai',
      contact_person: 'Senthil Nathan',
      phone: '9840123456',
      email: 'senthil@gtechcomponents.com',
      address: 'Richie Street, Chennai - 600002',
    }
  );
  console.log('4. Create Supplier -> Status:', supRes.status, 'ID:', supRes.data?.id, 'Name:', supRes.data?.name);
  if (supRes.status !== 201) throw new Error('Supplier creation failed');
  const supplierId = supRes.data.id;

  // 5. Create Product
  const sku = 'MB-TP-L14-' + Date.now();
  const prodRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/products', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Lenovo ThinkPad Motherboard L14 Gen 2',
      sku,
      category: 'Electronics',
      unit: 'pcs',
      hsn_code: '8473',
      gst_rate: 18,
      purchase_price: 5200,
      selling_price: 7800,
      minimum_stock: 2,
      current_stock: 0,
      supplier_id: supplierId,
    }
  );
  console.log('5. Create Product -> Status:', prodRes.status, 'ID:', prodRes.data?.id, 'Name:', prodRes.data?.name, 'SKU:', prodRes.data?.sku);
  if (prodRes.status !== 201) throw new Error('Product creation failed');
  const productId = prodRes.data.id;

  // 6. Stock In
  const stockInRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/stock/in', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { product_id: productId, quantity: 15, supplier_id: supplierId, reason: 'Purchase from G-Tech', notes: 'Invoice #GT-884' }
  );
  console.log('6. Stock In 15 units -> Status:', stockInRes.status, 'New Stock:', stockInRes.data?.product?.current_stock);
  if (stockInRes.data?.product?.current_stock !== 15) throw new Error('Stock in quantity mismatch');

  // 7. Search in Billing
  const searchRes = await request({ hostname: 'localhost', port: 5000, path: '/api/products?search=ThinkPad', method: 'GET' });
  console.log('7. Billing Search "ThinkPad" -> Matches:', searchRes.data?.length, 'Found item stock:', searchRes.data?.[0]?.current_stock);
  if (searchRes.data?.length !== 1) throw new Error('Product search failed');

  // 8. Generate & Save Bill with GST calculation
  const billRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/bills', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      customer_name: 'Manoj Kumar',
      customer_phone: '9842155555',
      customer_address: 'Fairlands, Salem',
      payment_method: 'GPay',
      items: [
        {
          product_id: productId,
          product_name: 'Lenovo ThinkPad Motherboard L14 Gen 2',
          quantity: 3,
          unit_price: 7800,
          discount: 0,
        },
      ],
      status: 'Paid',
    }
  );
  console.log('8. Create Bill -> Status:', billRes.status, 'Invoice #:', billRes.data?.invoice_number, 'Grand Total: ₹', billRes.data?.grand_total || billRes.data?.total);
  if (billRes.status !== 201) throw new Error('Bill creation failed');
  const billId = billRes.data.id;

  // 9. Verify bill details & snapshot bill_items
  const getBill = await request({ hostname: 'localhost', port: 5000, path: `/api/bills/${billId}`, method: 'GET' });
  console.log('9. Bill fetch details:', {
    invoice: getBill.data?.invoice_number,
    customer: getBill.data?.customer_name,
    taxable_amount: getBill.data?.taxable_amount,
    cgst: getBill.data?.cgst,
    sgst: getBill.data?.sgst,
    total: getBill.data?.grand_total || getBill.data?.total,
    first_item_snapshot: getBill.data?.items?.[0],
  });
  if (getBill.data?.items?.length !== 1 || getBill.data?.items[0]?.product_name !== 'Lenovo ThinkPad Motherboard L14 Gen 2') {
    throw new Error('Historical bill items snapshot verification failed');
  }

  // 10. Verify stock deduction (15 - 3 = 12)
  const prodAfterBill = await request({ hostname: 'localhost', port: 5000, path: `/api/products/${productId}`, method: 'GET' });
  console.log('10. Product Stock after sale of 3 units -> Current Stock:', prodAfterBill.data?.current_stock);
  if (prodAfterBill.data?.current_stock !== 12) throw new Error('Stock deduction failed');

  // 11. Reports verification
  const salesRep = await request({ hostname: 'localhost', port: 5000, path: '/api/reports/sales', method: 'GET' });
  console.log('11. Sales Report on Supabase -> Bill count:', salesRep.data?.billCount, 'Total sales: ₹', salesRep.data?.totalSales);
  if (salesRep.data?.billCount < 1) throw new Error('Sales report bill count mismatch');

  const stockRep = await request({ hostname: 'localhost', port: 5000, path: '/api/reports/stock', method: 'GET' });
  console.log('12. Stock Report on Supabase -> Rows count:', stockRep.data?.rows?.length, 'Product in report:', stockRep.data?.rows?.[0]?.name);

  // 13. Edit product
  const editProd = await request(
    { hostname: 'localhost', port: 5000, path: `/api/products/${productId}`, method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Lenovo ThinkPad Motherboard L14 Gen 2 (Original OEM)',
      sku,
      category: 'Electronics',
      unit: 'pcs',
      purchase_price: 5300,
      selling_price: 8000,
      minimum_stock: 3,
    }
  );
  console.log('13. Product Edit -> Status:', editProd.status, 'Updated Name:', editProd.data?.name);
  if (editProd.data?.name !== 'Lenovo ThinkPad Motherboard L14 Gen 2 (Original OEM)') throw new Error('Product edit failed');

  // 14. Delete / Archive verification on billed product
  const delBilled = await request({ hostname: 'localhost', port: 5000, path: `/api/products/${productId}`, method: 'DELETE' });
  console.log('14. Delete Billed Product -> Action:', delBilled.data?.action, 'Message:', delBilled.data?.message);
  if (delBilled.data?.action !== 'archived') throw new Error('Safe archive check failed');

  console.log('\n=====================================================');
  console.log('✓ ALL 14 SUPABASE BUSINESS FLOW TESTS PASSED 100%!');
  console.log('=====================================================\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
