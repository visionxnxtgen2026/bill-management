const { pool } = require('./pool');

async function checkRows() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM products');
    console.log('Existing products rows on Supabase:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
checkRows().catch(console.error);
