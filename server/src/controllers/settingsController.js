const { query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireString, optionalString } = require('../utils/validate');

// GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM settings ORDER BY id LIMIT 1');
  if (rows.length === 0) {
    const created = await query(
      `INSERT INTO settings (
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
      ) RETURNING *`
    );
    return res.json(created.rows[0]);
  }
  res.json(rows[0]);
});

// PUT /api/settings
const updateSettings = asyncHandler(async (req, res) => {
  const businessName = requireString(req.body.business_name, 'Business name');
  const tagline = optionalString(req.body.tagline) || 'CHIP LEVEL SERVICE';
  const proprietor = optionalString(req.body.proprietor) || 'GOKUL.P';
  const services = optionalString(req.body.services);
  const address = optionalString(req.body.address);
  const phone = optionalString(req.body.phone);
  const whatsapp = optionalString(req.body.whatsapp);
  const email = optionalString(req.body.email);
  const gstNumber = optionalString(req.body.gst_number);
  const state = optionalString(req.body.state) || 'Tamil Nadu';
  const stateCode = optionalString(req.body.state_code) || '33';
  const invoicePrefix = optionalString(req.body.invoice_prefix) || 'INV';
  const defaultGstRate = req.body.default_gst_rate !== undefined ? Number(req.body.default_gst_rate) : 18.0;
  const currency = optionalString(req.body.currency) || 'INR';
  const dateFormat = optionalString(req.body.date_format) || 'DD-MM-YYYY';
  const lowStockThresholdPercent = req.body.low_stock_threshold_percent
    ? Number(req.body.low_stock_threshold_percent)
    : 100;
  const terms = optionalString(req.body.terms);

  const existing = await query('SELECT id FROM settings ORDER BY id LIMIT 1');

  let result;
  if (existing.rows.length === 0) {
    result = await query(
      `INSERT INTO settings (
        business_name, tagline, proprietor, services, address, phone, whatsapp, email, gst_number,
        state, state_code, invoice_prefix, default_gst_rate, currency, date_format, low_stock_threshold_percent, terms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        businessName, tagline, proprietor, services, address, phone, whatsapp, email, gstNumber,
        state, stateCode, invoicePrefix, defaultGstRate, currency, dateFormat, lowStockThresholdPercent, terms
      ]
    );
  } else {
    result = await query(
      `UPDATE settings SET
        business_name=$1, tagline=$2, proprietor=$3, services=$4, address=$5, phone=$6, whatsapp=$7, email=$8, gst_number=$9,
        state=$10, state_code=$11, invoice_prefix=$12, default_gst_rate=$13, currency=$14, date_format=$15, low_stock_threshold_percent=$16, terms=$17
       WHERE id=$18 RETURNING *`,
      [
        businessName, tagline, proprietor, services, address, phone, whatsapp, email, gstNumber,
        state, stateCode, invoicePrefix, defaultGstRate, currency, dateFormat, lowStockThresholdPercent, terms,
        existing.rows[0].id
      ]
    );
  }

  res.json(result.rows[0]);
});

module.exports = { getSettings, updateSettings };
