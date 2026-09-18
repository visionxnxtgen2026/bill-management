const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stock_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function inspect() {
  console.log('Host:', process.env.DB_HOST, 'Database:', process.env.DB_NAME);
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
    WHERE sequence_schema = 'public';
  `);
  for (const s of seqs.rows) {
    const val = await pool.query(`SELECT last_value FROM "${s.sequence_name}"`);
    console.log(`- ${s.sequence_name}: last_value = ${val.rows[0]?.last_value}`);
  }

  console.log('\n--- SETTINGS TABLE CONTENT ---');
  try {
    const settings = await pool.query(`SELECT * FROM settings`);
    console.log('Settings rows count:', settings.rows.length);
    console.log('Settings data:', JSON.stringify(settings.rows, null, 2));
  } catch (err) {
    console.log('No settings table or error:', err.message);
  }

  await pool.end();
}

inspect().catch((err) => {
  console.error('Inspection error:', err);
  process.exit(1);
});
