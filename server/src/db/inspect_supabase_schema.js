const { pool } = require('./pool');

async function inspectSchema() {
  const client = await pool.connect();
  try {
    const tables = ['products', 'suppliers', 'bills', 'bill_items', 'stock_transactions', 'settings'];
    console.log('Checking required Stock Management tables on Supabase:');

    for (const table of tables) {
      const exists = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (exists.rows.length === 0) {
        console.log(`❌ Table "${table}" does NOT exist.`);
      } else {
        const columns = await client.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1 
           ORDER BY ordinal_position`,
          [table]
        );
        console.log(`✓ Table "${table}" exists with columns:`, columns.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

inspectSchema().catch(console.error);
