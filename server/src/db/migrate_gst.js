const { query } = require('./pool');

async function migrate() {
  console.log('Running GST Invoice Schema Migration...');

  await query(`
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS tagline VARCHAR(200) DEFAULT 'CHIP LEVEL SERVICE';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS proprietor VARCHAR(100) DEFAULT 'GOKUL.P';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS services TEXT DEFAULT 'Mobile service | System service | Laptop service\nPrinter service | CCTV camera installation\nAll models chip level service';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30) DEFAULT '88833 57115';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'Tamil Nadu';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS state_code VARCHAR(10) DEFAULT '33';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_gst_rate NUMERIC(5, 2) DEFAULT 18.00;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20) DEFAULT 'INV';
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT '1. Goods / components once sold will be covered under standard warranty.\n2. Service warranty applies as per chip-level service policy.\n3. Subject to Salem jurisdiction.';

    ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '8473';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.00;

    ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_address TEXT;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(30);
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT FALSE;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS cgst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS sgst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS igst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS total_gst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS round_off NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;

    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT '8473';
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 18.00;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS cgst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS sgst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS igst NUMERIC(12, 2) DEFAULT 0;
    ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12, 2) DEFAULT 0;
  `);

  // Update or insert G-TECHNOLOGIES business settings
  const existing = await query('SELECT id FROM settings ORDER BY id LIMIT 1');
  if (existing.rows.length === 0) {
    await query(`
      INSERT INTO settings (
        business_name, tagline, proprietor, services, phone, whatsapp, email, address, gst_number, state, state_code, default_gst_rate, invoice_prefix
      ) VALUES (
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
        'INV'
      )
    `);
  } else {
    await query(`
      UPDATE settings SET
        business_name = 'G - TECHNOLOGIES',
        tagline = 'CHIP LEVEL SERVICE',
        proprietor = 'GOKUL.P',
        services = 'Mobile service | System service | Laptop service\nPrinter service | CCTV camera installation\nAll models chip level service',
        phone = '86108 72917',
        whatsapp = '88833 57115',
        email = 'vaalugokul63@gmail.com',
        address = 'Perumal Malai Road, Narasothipatti,\nKuranguchavadi, Salem - 636 004.',
        gst_number = NULL,
        state = 'Tamil Nadu',
        state_code = '33',
        default_gst_rate = 18.00,
        invoice_prefix = 'INV'
      WHERE id = $1
    `, [existing.rows[0].id]);
  }

  const res = await query('SELECT * FROM settings ORDER BY id LIMIT 1');
  console.log('GST Migration complete! Current Settings:');
  console.log(res.rows[0]);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
