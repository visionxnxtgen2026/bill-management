const { query, withTransaction } = require('../db/pool');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { requirePositiveInt, optionalString, requireNonNegativeNumber } = require('../utils/validate');

const STOCK_OUT_REASONS = ['Sale', 'Damaged', 'Lost', 'Internal Use', 'Other'];

// POST /api/stock/in
const stockIn = asyncHandler(async (req, res) => {
  const productId = requirePositiveInt(req.body.product_id, 'Product');
  const quantity = requirePositiveInt(req.body.quantity, 'Quantity');
  const purchasePrice =
    req.body.purchase_price !== undefined && req.body.purchase_price !== ''
      ? requireNonNegativeNumber(req.body.purchase_price, 'Purchase price')
      : null;
  const supplierId = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const notes = optionalString(req.body.notes);

  const result = await withTransaction(async (client) => {
    const productRes = await client.query('SELECT id, name, current_stock FROM products WHERE id = $1 FOR UPDATE', [
      productId,
    ]);
    if (productRes.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }
    const product = productRes.rows[0];
    const newStock = product.current_stock + quantity;

    await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [newStock, productId]);

    if (purchasePrice !== null) {
      await client.query('UPDATE products SET purchase_price = $1 WHERE id = $2', [purchasePrice, productId]);
    }

    const txRes = await client.query(
      `INSERT INTO stock_transactions
        (product_id, product_name, type, quantity, previous_stock, new_stock, reason, supplier_id, unit_price, notes)
       VALUES ($1, $2, 'STOCK_IN', $3, $4, $5, 'Purchase', $6, $7, $8)
       RETURNING *`,
      [productId, product.name, quantity, product.current_stock, newStock, supplierId, purchasePrice, notes]
    );

    return { product: { ...product, current_stock: newStock, previous_stock: product.current_stock, new_stock: newStock }, transaction: txRes.rows[0] };
  });

  res.status(201).json(result);
});

// POST /api/stock/out
const stockOut = asyncHandler(async (req, res) => {
  const productId = requirePositiveInt(req.body.product_id, 'Product');
  const quantity = requirePositiveInt(req.body.quantity, 'Quantity');
  const reason = req.body.reason;
  const notes = optionalString(req.body.notes);

  if (!STOCK_OUT_REASONS.includes(reason)) {
    throw new AppError(`Reason must be one of: ${STOCK_OUT_REASONS.join(', ')}`);
  }

  const result = await withTransaction(async (client) => {
    const productRes = await client.query('SELECT id, name, current_stock FROM products WHERE id = $1 FOR UPDATE', [
      productId,
    ]);
    if (productRes.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }
    const product = productRes.rows[0];

    if (quantity > product.current_stock) {
      throw new AppError(
        `Insufficient stock. Only ${product.current_stock} unit(s) of "${product.name}" available.`,
        400
      );
    }

    const newStock = product.current_stock - quantity;
    await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [newStock, productId]);

    const txRes = await client.query(
      `INSERT INTO stock_transactions
        (product_id, product_name, type, quantity, previous_stock, new_stock, reason, notes)
       VALUES ($1, $2, 'STOCK_OUT', $3, $4, $5, $6, $7)
       RETURNING *`,
      [productId, product.name, quantity, product.current_stock, newStock, reason, notes]
    );

    return { product: { ...product, current_stock: newStock, previous_stock: product.current_stock, new_stock: newStock }, transaction: txRes.rows[0] };
  });

  res.status(201).json(result);
});

// GET /api/stock/history
const getStockHistory = asyncHandler(async (req, res) => {
  const { product_id, type, start_date, end_date } = req.query;
  const conditions = [];
  const params = [];

  if (product_id) {
    params.push(product_id);
    conditions.push(`st.product_id = $${params.length}`);
  }
  if (type && type !== 'all') {
    params.push(type);
    conditions.push(`st.type = $${params.length}`);
  }
  if (start_date) {
    params.push(start_date);
    conditions.push(`st.created_at >= $${params.length}`);
  }
  if (end_date) {
    params.push(end_date);
    conditions.push(`st.created_at <= $${params.length}::date + INTERVAL '1 day'`);
  }

  let sql = `
    SELECT st.id, st.type, st.quantity, st.previous_stock, st.new_stock, st.reason,
           st.reference_id, st.reference_type, st.notes, st.created_at,
           COALESCE(st.product_id, p.id) AS product_id,
           COALESCE(st.product_name, p.name, 'Unknown Product') AS product_name,
           COALESCE(p.sku, '') AS sku
    FROM stock_transactions st
    LEFT JOIN products p ON p.id = st.product_id
  `;
  if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' ORDER BY st.created_at DESC LIMIT 500';

  const { rows } = await query(sql, params);
  res.json(rows);
});

module.exports = { stockIn, stockOut, getStockHistory, STOCK_OUT_REASONS };
