const { query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const totalsQuery = query(`
    SELECT
      COUNT(*)::int AS total_products,
      COALESCE(SUM(current_stock), 0)::int AS total_stock,
      COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= minimum_stock)::int AS low_stock,
      COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock
    FROM products
  `);

  const newThisMonthQuery = query(`
    SELECT COUNT(*)::int AS count FROM products
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  `);

  const movementQuery = query(`
    SELECT
      day::date AS date,
      COALESCE(SUM(st.quantity) FILTER (WHERE st.type = 'STOCK_IN'), 0)::int AS stock_in,
      COALESCE(SUM(st.quantity) FILTER (WHERE st.type IN ('STOCK_OUT', 'SALE')), 0)::int AS stock_out
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day
    LEFT JOIN stock_transactions st ON st.created_at::date = day::date
    GROUP BY day
    ORDER BY day
  `);

  const activityQuery = query(`
    SELECT st.id, st.type, st.quantity, st.reason, st.created_at, p.name AS product_name
    FROM stock_transactions st
    JOIN products p ON p.id = st.product_id
    ORDER BY st.created_at DESC
    LIMIT 10
  `);

  const [totals, newThisMonth, movement, activity] = await Promise.all([
    totalsQuery,
    newThisMonthQuery,
    movementQuery,
    activityQuery,
  ]);

  const totalsRow = totals.rows[0] || {};
  const newRow = newThisMonth.rows[0] || {};

  res.json({
    totals: {
      totalProducts: totalsRow.total_products || 0,
      newProductsThisMonth: newRow.count || 0,
      totalStock: totalsRow.total_stock || 0,
      lowStock: totalsRow.low_stock || 0,
      outOfStock: totalsRow.out_of_stock || 0,
    },
    stockMovement: movement.rows.map((r) => ({
      date: r.date,
      stockIn: r.stock_in,
      stockOut: r.stock_out,
    })),
    recentActivities: activity.rows.map((r) => ({
      id: r.id,
      type: r.type,
      quantity: r.quantity,
      reason: r.reason,
      productName: r.product_name,
      createdAt: r.created_at,
    })),
  });
});

module.exports = { getDashboard };
