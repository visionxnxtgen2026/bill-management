/**
 * Generates a human-readable, sortable invoice number.
 * Format: INV-YYYYMMDD-<sequence within the day>
 */
async function generateInvoiceNumber(client) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count FROM bills WHERE invoice_number LIKE $1`,
    [`INV-${datePart}-%`]
  );
  const sequence = String(rows[0].count + 1).padStart(3, '0');
  return `INV-${datePart}-${sequence}`;
}

module.exports = { generateInvoiceNumber };
