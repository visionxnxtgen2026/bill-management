-- ============================================================
-- StockPro Seed Data
-- ============================================================
-- Purpose:
--   Inserts initial test data so the application is immediately
--   usable for Dashboard, Products, Stock, Reports and History.
--
-- Safe logic:
--   Opening stock transactions are created only when
--   current_stock > 0 because stock_transactions.quantity
--   must be greater than zero.
-- ============================================================


-- ============================================================
-- 1. SUPPLIERS
-- ============================================================

INSERT INTO suppliers (
    name,
    phone,
    email,
    address,
    notes
) VALUES
(
    'Sri Balaji Stationers',
    '9840012345',
    'balaji.stationers@example.com',
    'Salem, Tamil Nadu',
    'Primary stationery supplier'
),
(
    'Chennai Electronics Traders',
    '9884456789',
    'contact@cetraders.example.com',
    'T. Nagar, Chennai',
    'Electronics & peripherals'
),
(
    'Metro Paper Mills',
    '9994411223',
    'sales@metropaper.example.com',
    'Erode, Tamil Nadu',
    'Bulk paper products'
);


-- ============================================================
-- 2. SETTINGS
-- ============================================================

INSERT INTO settings (
    business_name,
    address,
    phone,
    email,
    gst_number,
    currency,
    date_format,
    low_stock_threshold_percent
)
VALUES (
    'StockPro Retail',
    'Salem, Tamil Nadu, India',
    '+91 98765 43210',
    'contact@stockpro.example.com',
    '33AAAAA0000A1Z5',
    'INR',
    'DD-MM-YYYY',
    100
);


-- ============================================================
-- 3. PRODUCTS
-- ============================================================

INSERT INTO products (
    name,
    sku,
    category,
    unit,
    purchase_price,
    selling_price,
    current_stock,
    minimum_stock,
    supplier_id,
    notes
) VALUES
(
    'Notebook',
    'NBK001',
    'Stationery',
    'pcs',
    30,
    40,
    120,
    20,
    1,
    '200 pages ruled notebook'
),
(
    'Ball Pen',
    'PEN001',
    'Stationery',
    'pcs',
    7,
    10,
    350,
    50,
    1,
    'Blue ink, pack of 1'
),
(
    'A4 Paper',
    'AP001',
    'Office',
    'ream',
    180,
    220,
    25,
    50,
    3,
    '500 sheets per ream'
),
(
    'Mouse',
    'MSE001',
    'Electronics',
    'pcs',
    420,
    550,
    8,
    10,
    2,
    'Wireless optical mouse'
),
(
    'Keyboard',
    'KBD001',
    'Electronics',
    'pcs',
    900,
    1200,
    0,
    5,
    2,
    'USB wired keyboard'
),
(
    'Monitor',
    'MON001',
    'Electronics',
    'pcs',
    5800,
    7000,
    15,
    10,
    2,
    '21.5 inch LED monitor'
);


-- ============================================================
-- 4. OPENING STOCK TRANSACTIONS
-- ============================================================
-- Only products with stock > 0 are inserted here.
-- This prevents quantity = 0 constraint errors for Keyboard.

INSERT INTO stock_transactions (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    notes,
    created_at
)
SELECT
    id,
    'STOCK_IN',
    current_stock,
    0,
    current_stock,
    'Opening Stock',
    'Initial stock load',
    NOW() - INTERVAL '10 days'
FROM products
WHERE current_stock > 0;


-- ============================================================
-- 5. RECENT STOCK TRANSACTIONS
-- ============================================================
-- These records provide realistic Dashboard / Reports /
-- History data for testing.


-- Notebook - Purchase
INSERT INTO stock_transactions (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    notes,
    created_at
)
VALUES (
    (SELECT id FROM products WHERE sku = 'NBK001'),
    'STOCK_IN',
    50,
    70,
    120,
    'Purchase',
    'Restock from supplier',
    NOW() - INTERVAL '2 hours'
);


-- Ball Pen - Sale
INSERT INTO stock_transactions (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    notes,
    created_at
)
VALUES (
    (SELECT id FROM products WHERE sku = 'PEN001'),
    'STOCK_OUT',
    10,
    360,
    350,
    'Sale',
    'Counter sale',
    NOW() - INTERVAL '15 minutes'
);


-- A4 Paper - Purchase
INSERT INTO stock_transactions (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    notes,
    created_at
)
VALUES (
    (SELECT id FROM products WHERE sku = 'AP001'),
    'STOCK_IN',
    100,
    0,
    100,
    'Purchase',
    'New product added',
    NOW() - INTERVAL '3 hours'
);


-- Keyboard - Damaged
INSERT INTO stock_transactions (
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    notes,
    created_at
)
VALUES (
    (SELECT id FROM products WHERE sku = 'KBD001'),
    'STOCK_OUT',
    5,
    10,
    5,
    'Damaged',
    'Damaged in transit',
    NOW() - INTERVAL '3 hours'
);