const { query } = require('./pool');

async function migrate() {
  console.log('Running Foreign Key and Product Archive Migration...');

  // 1. Add is_active column to products
  await query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
  `);

  // 2. Add snapshot columns to bill_items
  await query(`
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(150);
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs';
  `);

  // 3. Backfill snapshot data for existing bill_items
  await query(`
    UPDATE bill_items bi
    SET
      product_name = COALESCE(bi.product_name, p.name),
      sku = COALESCE(bi.sku, p.sku),
      unit = COALESCE(bi.unit, p.unit, 'pcs')
    FROM products p
    WHERE bi.product_id = p.id;
  `);

  // 4. Update foreign key on bill_items to ON DELETE SET NULL and allow null product_id
  await query(`
    ALTER TABLE bill_items ALTER COLUMN product_id DROP NOT NULL;
    ALTER TABLE bill_items DROP CONSTRAINT IF EXISTS bill_items_product_id_fkey;
    ALTER TABLE bill_items ADD CONSTRAINT bill_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  `);

  // 5. Add product_name snapshot to stock_transactions and update FK to ON DELETE SET NULL
  await query(`
    ALTER TABLE stock_transactions ADD COLUMN IF NOT EXISTS product_name VARCHAR(150);
    UPDATE stock_transactions st
    SET product_name = COALESCE(st.product_name, p.name)
    FROM products p
    WHERE st.product_id = p.id;

    ALTER TABLE stock_transactions ALTER COLUMN product_id DROP NOT NULL;
    ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_product_id_fkey;
    ALTER TABLE stock_transactions ADD CONSTRAINT stock_transactions_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  `);

  console.log('Migration completed successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
