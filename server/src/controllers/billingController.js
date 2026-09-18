const { query, withTransaction } = require('../db/pool');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { optionalString, requirePositiveInt, requireNonNegativeNumber } = require('../utils/validate');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

// GET /api/bills
const getBills = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, invoice_number, customer_name, customer_phone, payment_method, is_interstate,
            subtotal, discount, taxable_amount, cgst, sgst, igst, total_gst, round_off,
            COALESCE(grand_total, total) AS grand_total, total, created_at
     FROM bills ORDER BY created_at DESC LIMIT 200`
  );
  res.json(rows);
});

// GET /api/bills/:id
const getBillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const billRes = await query('SELECT * FROM bills WHERE id = $1', [id]);
  if (billRes.rows.length === 0) throw new AppError('Bill not found.', 404);

  const bill = billRes.rows[0];

  const items = await query(
    `SELECT bi.*,
            COALESCE(bi.product_name, p.name, 'Item') AS product_name,
            COALESCE(bi.sku, p.sku, '') AS sku,
            COALESCE(bi.unit, p.unit, 'pcs') AS unit,
            COALESCE(bi.hsn_code, p.hsn_code, '8473') AS hsn_code
     FROM bill_items bi
     LEFT JOIN products p ON p.id = bi.product_id
     WHERE bi.bill_id = $1
     ORDER BY bi.id`,
    [id]
  );

  const settingsRes = await query('SELECT * FROM settings ORDER BY id LIMIT 1');
  const settings = settingsRes.rows[0] || {};

  res.json({
    ...bill,
    grand_total: bill.grand_total || bill.total,
    items: items.rows,
    settings,
  });
});

// POST /api/bills
const createBill = asyncHandler(async (req, res) => {
  const {
    items,
    customer_name,
    customer_phone,
    customer_address,
    customer_gstin,
    payment_method,
    is_interstate,
    discount,
    notes,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('A bill must contain at least one item.');
  }

  const customerName = optionalString(customer_name) || 'Walk-in Customer';
  const customerPhone = optionalString(customer_phone);
  const customerAddress = optionalString(customer_address);
  const customerGstin = optionalString(customer_gstin);
  const paymentMethod = optionalString(payment_method) || 'Cash';
  const isInterstate = Boolean(is_interstate);
  const billNotes = optionalString(notes);
  const discountAmount = discount !== undefined ? requireNonNegativeNumber(discount, 'Discount') : 0;

  const parsedItems = items.map((item, index) => ({
    productId: requirePositiveInt(item.product_id, `Item ${index + 1} product`),
    quantity: requirePositiveInt(item.quantity, `Item ${index + 1} quantity`),
    price: item.price !== undefined ? requireNonNegativeNumber(item.price, `Item ${index + 1} price`) : null,
    discount: item.discount !== undefined ? requireNonNegativeNumber(item.discount, `Item ${index + 1} discount`) : 0,
    hsnCode: optionalString(item.hsn_code),
    gstRate: item.gst_rate !== undefined ? requireNonNegativeNumber(item.gst_rate, `Item ${index + 1} GST rate`) : null,
  }));

  const result = await withTransaction(async (client) => {
    let rawSubtotal = 0;
    const validatedProducts = [];

    // 1. Validate stock & lock rows
    for (const item of parsedItems) {
      const productRes = await client.query(
        'SELECT id, name, sku, unit, selling_price, current_stock, hsn_code, gst_rate FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );
      if (productRes.rows.length === 0) {
        throw new AppError(`Product with id ${item.productId} not found.`, 404);
      }
      const product = productRes.rows[0];

      if (item.quantity > product.current_stock) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Only ${product.current_stock} unit(s) available.`,
          400
        );
      }

      const unitPrice = item.price !== null ? item.price : Number(product.selling_price);
      const gross = unitPrice * item.quantity;
      rawSubtotal += gross;

      validatedProducts.push({
        ...item,
        product,
        unitPrice,
        gross,
        productName: product.name,
        sku: product.sku,
        unit: product.unit || 'pcs',
        hsnCode: item.hsnCode || product.hsn_code || '8473',
        gstRate: item.gstRate !== null ? item.gstRate : (product.gst_rate !== null ? Number(product.gst_rate) : 18.0),
      });
    }

    if (discountAmount > rawSubtotal) {
      throw new AppError('Discount cannot be greater than the subtotal.');
    }

    // 2. Compute discount allocation and GST per line item
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineItems = validatedProducts.map((p) => {
      // Pro-rate overall discount across items if item discount not explicitly set
      const allocatedDiscount =
        p.discount > 0
          ? p.discount
          : rawSubtotal > 0
          ? Math.round(((p.gross / rawSubtotal) * discountAmount) * 100) / 100
          : 0;

      const taxable = Math.max(0, Math.round((p.gross - allocatedDiscount) * 100) / 100);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (!isInterstate) {
        const halfRate = p.gstRate / 2;
        cgst = Math.round(((taxable * halfRate) / 100) * 100) / 100;
        sgst = Math.round(((taxable * halfRate) / 100) * 100) / 100;
      } else {
        igst = Math.round(((taxable * p.gstRate) / 100) * 100) / 100;
      }

      const gstAmount = cgst + sgst + igst;
      const lineTotal = Math.round((taxable + gstAmount) * 100) / 100;

      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        ...p,
        discount: allocatedDiscount,
        taxableAmount: taxable,
        cgst,
        sgst,
        igst,
        gstAmount,
        lineTotal,
      };
    });

    const totalGst = totalCgst + totalSgst + totalIgst;
    const computedGrand = totalTaxable + totalGst;
    const roundedGrandTotal = Math.round(computedGrand);
    const roundOff = Math.round((roundedGrandTotal - computedGrand) * 100) / 100;

    const invoiceNumber = await generateInvoiceNumber(client);

    const billRes = await client.query(
      `INSERT INTO bills (
        invoice_number, customer_name, customer_phone, customer_address, customer_gstin,
        payment_method, is_interstate, subtotal, discount, taxable_amount,
        cgst, sgst, igst, total_gst, round_off, grand_total, total, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        invoiceNumber,
        customerName,
        customerPhone,
        customerAddress,
        customerGstin,
        paymentMethod,
        isInterstate,
        rawSubtotal,
        discountAmount,
        totalTaxable,
        totalCgst,
        totalSgst,
        totalIgst,
        totalGst,
        roundOff,
        roundedGrandTotal,
        roundedGrandTotal,
        billNotes,
      ]
    );
    const bill = billRes.rows[0];

    // 3. Insert bill items with snapshot columns and update stock
    for (const line of lineItems) {
      await client.query(
        `INSERT INTO bill_items (
          bill_id, product_id, product_name, sku, unit, hsn_code, quantity, price, discount,
          taxable_amount, gst_rate, cgst, sgst, igst, gst_amount, total
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          bill.id,
          line.product.id,
          line.productName,
          line.sku,
          line.unit,
          line.hsnCode,
          line.quantity,
          line.unitPrice,
          line.discount,
          line.taxableAmount,
          line.gstRate,
          line.cgst,
          line.sgst,
          line.igst,
          line.gstAmount,
          line.lineTotal,
        ]
      );

      const newStock = line.product.current_stock - line.quantity;
      await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [newStock, line.product.id]);

      await client.query(
        `INSERT INTO stock_transactions
          (product_id, product_name, type, quantity, previous_stock, new_stock, reason, reference_id, reference_type, notes)
         VALUES ($1, $2, 'SALE', $3, $4, $5, 'Sale', $6, 'BILL', $7)`,
        [line.product.id, line.productName, line.quantity, line.product.current_stock, newStock, bill.id, `Invoice ${invoiceNumber}`]
      );
    }

    return bill;
  });

  const itemsOut = await query(
    `SELECT bi.*,
            COALESCE(bi.product_name, p.name, 'Item') AS product_name,
            COALESCE(bi.sku, p.sku, '') AS sku,
            COALESCE(bi.unit, p.unit, 'pcs') AS unit
     FROM bill_items bi
     LEFT JOIN products p ON p.id = bi.product_id
     WHERE bi.bill_id = $1`,
    [result.id]
  );

  res.status(201).json({ ...result, items: itemsOut.rows });
});

module.exports = { getBills, getBillById, createBill };
