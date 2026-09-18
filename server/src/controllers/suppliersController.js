const { query } = require('../db/pool');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { requireString, optionalString } = require('../utils/validate');

// GET /api/suppliers
const getSuppliers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM suppliers';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    sql += ` WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1`;
  }
  sql += ' ORDER BY name ASC';
  const { rows } = await query(sql, params);
  res.json(rows);
});

// GET /api/suppliers/:id  (also returns their products + recent stock-in history)
const getSupplierById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supplier = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
  if (supplier.rows.length === 0) throw new AppError('Supplier not found.', 404);

  const products = await query(
    `SELECT id, name, sku, category, current_stock, selling_price FROM products WHERE supplier_id = $1 ORDER BY name`,
    [id]
  );

  const history = await query(
    `SELECT st.id, st.quantity, st.previous_stock, st.new_stock, st.created_at, p.name AS product_name
     FROM stock_transactions st
     JOIN products p ON p.id = st.product_id
     WHERE st.supplier_id = $1 AND st.type = 'STOCK_IN'
     ORDER BY st.created_at DESC
     LIMIT 50`,
    [id]
  );

  res.json({ ...supplier.rows[0], products: products.rows, purchaseHistory: history.rows });
});

function validateSupplierInput(body) {
  const name = requireString(body.name, 'Supplier name');
  const phone = optionalString(body.phone);
  const email = optionalString(body.email);
  const address = optionalString(body.address);
  const notes = optionalString(body.notes);
  return { name, phone, email, address, notes };
}

// POST /api/suppliers
const createSupplier = asyncHandler(async (req, res) => {
  const v = validateSupplierInput(req.body);
  const { rows } = await query(
    `INSERT INTO suppliers (name, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [v.name, v.phone, v.email, v.address, v.notes]
  );
  res.status(201).json(rows[0]);
});

// PUT /api/suppliers/:id
const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query('SELECT id FROM suppliers WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw new AppError('Supplier not found.', 404);

  const v = validateSupplierInput(req.body);
  const { rows } = await query(
    `UPDATE suppliers SET name=$1, phone=$2, email=$3, address=$4, notes=$5 WHERE id=$6 RETURNING *`,
    [v.name, v.phone, v.email, v.address, v.notes, id]
  );
  res.json(rows[0]);
});

// DELETE /api/suppliers/:id
const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id]);
  if (rows.length === 0) throw new AppError('Supplier not found.', 404);
  res.json({ message: 'Supplier deleted successfully.' });
});

module.exports = { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
