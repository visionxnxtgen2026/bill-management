const { query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errorHandler');

function dateRangeParams(req) {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = end_date || new Date().toISOString().slice(0, 10);
  return { start, end };
}

// GET /api/reports/stock  — opening / in / out / closing per product over a date range
const getStockSummary = asyncHandler(async (req, res) => {
  const { start, end } = dateRangeParams(req);

  const { rows } = await query(
    `
    SELECT
      p.id, p.name, p.category,
      COALESCE((
        SELECT SUM(CASE WHEN st.type = 'STOCK_IN' THEN st.quantity ELSE -st.quantity END)
        FROM stock_transactions st WHERE st.product_id = p.id AND st.created_at < $1::date
      ), 0)::int AS opening_stock,
      COALESCE((
        SELECT SUM(st.quantity) FROM stock_transactions st
        WHERE st.product_id = p.id AND st.type = 'STOCK_IN' AND st.created_at::date BETWEEN $1 AND $2
      ), 0)::int AS stock_in,
      COALESCE((
        SELECT SUM(st.quantity) FROM stock_transactions st
        WHERE st.product_id = p.id AND st.type IN ('STOCK_OUT','SALE') AND st.created_at::date BETWEEN $1 AND $2
      ), 0)::int AS stock_out,
      p.current_stock AS closing_stock
    FROM products p
    ORDER BY p.name
    `,
    [start, end]
  );

  res.json({ range: { start, end }, rows });
});

// GET /api/reports/low-stock
const getLowStockReport = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT id, name, sku, category, current_stock, minimum_stock
    FROM products
    WHERE current_stock > 0 AND current_stock <= minimum_stock
    ORDER BY (current_stock::float / NULLIF(minimum_stock, 0)) ASC
  `);
  res.json(rows);
});

// GET /api/reports/out-of-stock
const getOutOfStockReport = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT id, name, sku, category, minimum_stock
    FROM products
    WHERE current_stock = 0
    ORDER BY name
  `);
  res.json(rows);
});

// GET /api/reports/sales
const getSalesReport = asyncHandler(async (req, res) => {
  const { start, end } = dateRangeParams(req);

  const summary = await query(
    `SELECT COUNT(*)::int AS bill_count, COALESCE(SUM(total),0)::numeric AS total_sales
     FROM bills WHERE created_at::date BETWEEN $1 AND $2`,
    [start, end]
  );

  const topProducts = await query(
    `SELECT COALESCE(bi.product_name, p.name, 'Item') AS name, SUM(bi.quantity)::int AS units_sold, SUM(bi.total)::numeric AS revenue
     FROM bill_items bi
     JOIN bills b ON b.id = bi.bill_id
     LEFT JOIN products p ON p.id = bi.product_id
     WHERE b.created_at::date BETWEEN $1 AND $2
     GROUP BY COALESCE(bi.product_name, p.name, 'Item')
     ORDER BY revenue DESC
     LIMIT 10`,
    [start, end]
  );

  const dailySales = await query(
    `SELECT created_at::date AS date, COUNT(*)::int AS bill_count, SUM(total)::numeric AS total
     FROM bills WHERE created_at::date BETWEEN $1 AND $2
     GROUP BY created_at::date ORDER BY date`,
    [start, end]
  );

  res.json({
    range: { start, end },
    billCount: summary.rows[0].bill_count,
    totalSales: summary.rows[0].total_sales,
    topProducts: topProducts.rows,
    dailySales: dailySales.rows,
  });
});

module.exports = { getStockSummary, getLowStockReport, getOutOfStockReport, getSalesReport };
