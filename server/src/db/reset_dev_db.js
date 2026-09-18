const { pool } = require('./pool');

async function resetDevelopmentDatabase() {
  console.log('=====================================================');
  console.log('RESETTING LOCAL DEVELOPMENT DATABASE (stock_management)');
  console.log('=====================================================\n');

  const client = await pool.connect();

  try {
    // 1. Verify environment / database name
    const dbInfo = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port()');
    const { current_database, inet_server_addr, inet_server_port } = dbInfo.rows[0];
    console.log(`Target: Database="${current_database}", Host="${inet_server_addr}", Port="${inet_server_port}"`);

    if (current_database !== 'stock_management') {
      throw new Error(`Safety check failed: unexpected database "${current_database}"`);
    }

    await client.query('BEGIN');

    console.log('\n1. Clearing transactional & catalog test data...');
    // Truncate tables with RESTART IDENTITY
    // Note: TRUNCATE ... RESTART IDENTITY CASCADE resets the auto-increment sequences for these tables safely within transaction
    await client.query(`
      TRUNCATE TABLE 
        bill_items, 
        bills, 
        stock_transactions, 
        products, 
        suppliers 
      RESTART IDENTITY CASCADE;
    `);

    console.log('   ✓ bill_items cleared & sequence reset to 1');
    console.log('   ✓ bills cleared & sequence reset to 1');
    console.log('   ✓ stock_transactions cleared & sequence reset to 1');
    console.log('   ✓ products cleared & sequence reset to 1');
    console.log('   ✓ suppliers cleared & sequence reset to 1');

    console.log('\n2. Preserving / refreshing G - TECHNOLOGIES business settings...');
    // Ensure clean single settings row (id = 1) for G - TECHNOLOGIES
    await client.query(`DELETE FROM settings;`);
    await client.query(`
      INSERT INTO settings (
        id,
        business_name,
        tagline,
        proprietor,
        services,
        phone,
        whatsapp,
        email,
        address,
        gst_number,
        state,
        state_code,
        default_gst_rate,
        currency,
        date_format,
        low_stock_threshold_percent,
        invoice_prefix,
        terms
      ) VALUES (
        1,
        'G - TECHNOLOGIES',
        'CHIP LEVEL SERVICE',
        'GOKUL.P',
        'Mobile service | System service | Laptop service\nPrinter service | CCTV camera installation\nAll models chip level service',
        '86108 72917',
        '88833 57115',
        'vaalugokul63@gmail.com',
        'Perumal Malai Road, Narasothipatti,\nKuranguchavadi, Salem - 636 004.',
        NULL,
        'Tamil Nadu',
        '33',
        18.00,
        'INR',
        'DD-MM-YYYY',
        100,
        'INV',
        '1. Goods / components once sold will be covered under standard warranty.\n2. Service warranty applies as per chip-level service policy.\n3. Subject to Salem jurisdiction.'
      );
    `);
    await client.query(`SELECT setval('settings_id_seq', 1, true);`);
    console.log('   ✓ settings row 1 configured and preserved with G - TECHNOLOGIES details');

    await client.query('COMMIT');
    console.log('\n✓ Transaction committed successfully.');

    // 3. Post-reset verification query
    console.log('\n--- POST-RESET ROW COUNTS ---');
    const tables = ['products', 'suppliers', 'bills', 'bill_items', 'stock_transactions', 'settings'];
    for (const t of tables) {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`- ${t}: ${res.rows[0].count} rows`);
    }

    console.log('\n--- SEQUENCE STATUS ---');
    const seqs = [
      'products_id_seq',
      'suppliers_id_seq',
      'bills_id_seq',
      'bill_items_id_seq',
      'stock_transactions_id_seq',
      'settings_id_seq',
    ];
    for (const s of seqs) {
      const res = await client.query(`SELECT last_value, is_called FROM "${s}"`);
      console.log(`- ${s}: last_value = ${res.rows[0].last_value}, is_called = ${res.rows[0].is_called}`);
    }

    console.log('\n=====================================================');
    console.log('LOCAL DATABASE RESET COMPLETE & READY FOR TESTING');
    console.log('=====================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Reset failed, transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDevelopmentDatabase().catch(() => process.exit(1));
