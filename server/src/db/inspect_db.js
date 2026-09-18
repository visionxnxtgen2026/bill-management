const { pool } = require('./pool');

async function inspect() {
  console.log('Inspecting database...');
  const dbInfo = await pool.query(`SELECT current_database(), inet_server_addr(), inet_server_port();`);
  console.log('Connected database info:', dbInfo.rows[0]);

  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('\n--- TABLES & ROW COUNTS ---');
  for (const t of tables.rows) {
    const count = await pool.query(`SELECT count(*) FROM "${t.table_name}"`);
    console.log(`- ${t.table_name}: ${count.rows[0].count} rows`);
  }

  console.log('\n--- SEQUENCES ---');
  const seqs = await pool.query(`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
  `);
  for (const s of seqs.rows) {
    const val = await pool.query(`SELECT last_value FROM "${s.sequence_name}"`);
    console.log(`- ${s.sequence_name}: last_value = ${val.rows[0]?.last_value}`);
  }

  console.log('\n--- SETTINGS TABLE DATA ---');
  try {
    const settings = await pool.query(`SELECT * FROM settings`);
    console.log(`Settings rows: ${settings.rows.length}`);
    console.log(JSON.stringify(settings.rows, null, 2));
  } catch (e) {
    console.log('No settings table or error:', e.message);
  }

  await pool.end();
}

inspect().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
