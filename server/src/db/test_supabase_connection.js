const { pool, getMaskedConnectionInfo } = require('./pool');

async function testSupabase() {
  console.log('=====================================================');
  console.log('TESTING SUPABASE POSTGRESQL CONNECTION');
  console.log('=====================================================\n');

  console.log(`Connection: ${getMaskedConnectionInfo()}`);

  const client = await pool.connect();
  try {
    const timeRes = await client.query('SELECT NOW() AS current_time;');
    console.log('✓ Query "SELECT NOW();" succeeded:', timeRes.rows[0].current_time);

    const dbRes = await client.query('SELECT current_database(), inet_server_addr(), inet_server_port();');
    console.log('✓ Query "SELECT current_database();":', dbRes.rows[0]);

    // Check existing tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n--- EXISTING TABLES ON SUPABASE INSTANCE ---');
    if (tablesRes.rows.length === 0) {
      console.log('(No public tables found yet on this Supabase database)');
    } else {
      for (const t of tablesRes.rows) {
        const count = await client.query(`SELECT count(*) FROM "${t.table_name}"`);
        console.log(`- ${t.table_name}: ${count.rows[0].count} rows`);
      }
    }
  } catch (err) {
    console.error('❌ Supabase connection test failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

testSupabase().catch(() => process.exit(1));
