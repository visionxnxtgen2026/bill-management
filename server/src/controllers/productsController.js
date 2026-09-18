const { query, withTransaction } = require('../db/pool');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const {
  requireString,
  optionalString,
  requireNonNegativeNumber,
} = require('../utils/validate');

const PRODUCT_SELECT = `
  SELECT
    p.id, p.name, p.sku, p.category, p.unit, p.hsn_code, p.gst_rate,
    p.purchase_price, p.selling_price, p.current_stock, p.minimum_stock,
    p.supplier_id, s.name AS supplier_name,
    p.image, p.notes, p.is_active, p.created_at, p.updated_at,
    CASE
      WHEN p.is_active = FALSE THEN 'Archived'
      WHEN p.current_stock = 0 THEN 'Out of Stock'
      WHEN p.current_stock <= p.minimum_stock THEN 'Low Stock'
      ELSE 'In Stock'
    END AS status
  FROM products p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
`;

// GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, include_archived } = req.query;
  const conditions = [];
  const params = [];

  // Active status filter
  if (status === 'archived' || status === 'inactive') {
    conditions.push('p.is_active = FALSE');
  } else if (status === 'all-including-archived' || include_archived === 'true') {
    // No is_active condition
  } else {
    // Default: only active products
    conditions.push('p.is_active = TRUE');
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (category && category !== 'all') {
    params.push(category);
    conditions.push(`p.category = $${params.length}`);
  }

  let sql = PRODUCT_SELECT;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY p.name ASC';

  const { rows } = await query(sql, params);

  // Stock status in-memory filtering for specialized tabs
  const filtered =
    status && status !== 'all' && status !== 'archived' && status !== 'all-including-archived'
      ? rows.filter((p) => p.status.toLowerCase().replace(/\s/g, '-') === status)
      : rows;

  res.json(filtered);
});

// GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id]);
  if (rows.length === 0) throw new AppError('Product not found.', 404);

  const billUsage = await query('SELECT COUNT(*)::int AS count FROM bill_items WHERE product_id = $1', [req.params.id]);
  const txUsage = await query('SELECT COUNT(*)::int AS count FROM stock_transactions WHERE product_id = $1', [req.params.id]);

  res.json({
    ...rows[0],
    has_bill_history: (billUsage.rows[0]?.count || 0) > 0,
    has_tx_history: (txUsage.rows[0]?.count || 0) > 0,
  });
});

// GET /api/products/:id/usage
const getProductUsage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productRes = await query('SELECT id, name FROM products WHERE id = $1', [id]);
  if (productRes.rows.length === 0) throw new AppError('Product not found.', 404);

  const billUsage = await query('SELECT COUNT(*)::int AS count FROM bill_items WHERE product_id = $1', [id]);
  const txUsage = await query('SELECT COUNT(*)::int AS count FROM stock_transactions WHERE product_id = $1', [id]);

  const billCount = billUsage.rows[0]?.count || 0;
  const txCount = txUsage.rows[0]?.count || 0;

  res.json({
    product_id: Number(id),
    product_name: productRes.rows[0].name,
    bill_items_count: billCount,
    stock_transactions_count: txCount,
    can_permanently_delete: billCount === 0 && txCount === 0,
    requires_archive: billCount > 0 || txCount > 0,
  });
});

function validateProductInput(body) {
  const name = requireString(body.name, 'Product name');
  const sku = requireString(body.sku, 'SKU').toUpperCase();
  const category = requireString(body.category, 'Category');
  const unit = optionalString(body.unit) || 'pcs';
  const hsnCode = optionalString(body.hsn_code) || '8473';
  const gstRate = body.gst_rate !== undefined ? requireNonNegativeNumber(body.gst_rate, 'GST rate') : 18.0;
  const purchasePrice = requireNonNegativeNumber(body.purchase_price, 'Purchase price');
  const sellingPrice = requireNonNegativeNumber(body.selling_price, 'Selling price');
  const minimumStock = requireNonNegativeNumber(body.minimum_stock, 'Minimum stock level');
  const supplierId = body.supplier_id ? Number(body.supplier_id) : null;
  const image = optionalString(body.image);
  const notes = optionalString(body.notes);
  const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

  return { name, sku, category, unit, hsnCode, gstRate, purchasePrice, sellingPrice, minimumStock, supplierId, image, notes, isActive };
}

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const v = validateProductInput(req.body);

  const existing = await query('SELECT id FROM products WHERE sku = $1', [v.sku]);
  if (existing.rows.length > 0) {
    throw new AppError('SKU already exists. Choose a unique SKU.', 409);
  }

  const initialStock = req.body.current_stock ? requireNonNegativeNumber(req.body.current_stock, 'Initial stock') : 0;

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO products
        (name, sku, category, unit, hsn_code, gst_rate, purchase_price, selling_price, current_stock, minimum_stock, supplier_id, image, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [v.name, v.sku, v.category, v.unit, v.hsnCode, v.gstRate, v.purchasePrice, v.sellingPrice, initialStock, v.minimumStock, v.supplierId, v.image, v.notes, v.isActive]
    );
    const productId = rows[0].id;

    if (initialStock > 0) {
      await client.query(
        `INSERT INTO stock_transactions (product_id, product_name, type, quantity, previous_stock, new_stock, reason, notes)
         VALUES ($1, $2, 'STOCK_IN', $3, 0, $3, 'Opening Stock', 'Initial stock on product creation')`,
        [productId, v.name, initialStock]
      );
    }
    return productId;
  });

  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [result]);
  res.status(201).json(rows[0]);
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT id FROM products WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw new AppError('Product not found.', 404);

  const v = validateProductInput(req.body);

  const skuOwner = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [v.sku, id]);
  if (skuOwner.rows.length > 0) {
    throw new AppError('SKU already exists. Choose a unique SKU.', 409);
  }

  await query(
    `UPDATE products SET
      name = $1, sku = $2, category = $3, unit = $4, hsn_code = $5, gst_rate = $6,
      purchase_price = $7, selling_price = $8, minimum_stock = $9,
      supplier_id = $10, image = $11, notes = $12, is_active = $13
     WHERE id = $14`,
    [v.name, v.sku, v.category, v.unit, v.hsnCode, v.gstRate, v.purchasePrice, v.sellingPrice, v.minimumStock, v.supplierId, v.image, v.notes, v.isActive, id]
  );

  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  res.json(rows[0]);
});

// PUT /api/products/:id/restore
const restoreProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT id, name FROM products WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw new AppError('Product not found.', 404);

  await query('UPDATE products SET is_active = TRUE WHERE id = $1', [id]);
  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  res.json({
    success: true,
    message: `"${existing.rows[0].name}" has been restored to active status.`,
    product: rows[0],
  });
});

// DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT id, name, is_active FROM products WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw new AppError('Product not found.', 404);

  const product = existing.rows[0];

  // Check references in bill_items
  const billUsage = await query('SELECT COUNT(*)::int AS count FROM bill_items WHERE product_id = $1', [id]);
  const billCount = billUsage.rows[0]?.count || 0;

  // Check references in non-opening stock transactions
  const txUsage = await query(
    "SELECT COUNT(*)::int AS count FROM stock_transactions WHERE product_id = $1 AND reason != 'Opening Stock'",
    [id]
  );
  const txCount = txUsage.rows[0]?.count || 0;

  if (billCount > 0 || txCount > 0) {
    // CASE 2: Product used in billing or inventory history -> Safe Archive
    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
    return res.json({
      success: true,
      action: 'archived',
      message: `"${product.name}" is used in ${billCount > 0 ? 'billing history' : 'stock history'} and has been safely archived.`,
    });
  }

  // CASE 1: Product never used in any bill or non-opening stock transaction -> Safe Permanent Deletion
  await query('DELETE FROM stock_transactions WHERE product_id = $1', [id]);
  await query('DELETE FROM products WHERE id = $1', [id]);

  res.json({
    success: true,
    action: 'deleted',
    message: `"${product.name}" has been permanently deleted.`,
  });
});

module.exports = {
  getProducts,
  getProductById,
  getProductUsage,
  createProduct,
  updateProduct,
  restoreProduct,
  deleteProduct,
};
