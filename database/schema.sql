-- StockPro Stock Management System
-- PostgreSQL schema

DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(30),
    email       VARCHAR(150),
    address     TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers (name);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    sku             VARCHAR(50) NOT NULL UNIQUE,
    category        VARCHAR(100) NOT NULL,
    unit            VARCHAR(20) NOT NULL DEFAULT 'pcs',
    hsn_code        VARCHAR(20) DEFAULT '8473',
    gst_rate        NUMERIC(5, 2) DEFAULT 18.00,
    purchase_price  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    current_stock   INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock   INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    supplier_id     INTEGER REFERENCES suppliers (id) ON DELETE SET NULL,
    image           TEXT,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_supplier ON products (supplier_id);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_is_active ON products (is_active);
CREATE INDEX idx_products_low_stock ON products (current_stock, minimum_stock);

-- ============================================================
-- STOCK TRANSACTIONS  (full audit trail of every stock change)
-- ============================================================
CREATE TABLE stock_transactions (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products (id) ON DELETE SET NULL,
    product_name    VARCHAR(150),
    type            VARCHAR(20) NOT NULL CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'SALE')),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    previous_stock  INTEGER NOT NULL,
    new_stock       INTEGER NOT NULL,
    reason          VARCHAR(50),
    reference_id    INTEGER,
    reference_type  VARCHAR(20),
    supplier_id     INTEGER REFERENCES suppliers (id) ON DELETE SET NULL,
    unit_price      NUMERIC(12, 2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_tx_product ON stock_transactions (product_id);
CREATE INDEX idx_stock_tx_type ON stock_transactions (type);
CREATE INDEX idx_stock_tx_created ON stock_transactions (created_at);

-- ============================================================
-- BILLS (Sales / Invoices)
-- ============================================================
CREATE TABLE bills (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    customer_name   VARCHAR(150) DEFAULT 'Walk-in Customer',
    customer_phone  VARCHAR(30),
    customer_address TEXT,
    customer_gstin  VARCHAR(30),
    payment_method  VARCHAR(50) DEFAULT 'Cash',
    is_interstate   BOOLEAN DEFAULT FALSE,
    subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    taxable_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cgst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sgst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    igst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_gst       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    round_off       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_created ON bills (created_at);
CREATE INDEX idx_bills_invoice ON bills (invoice_number);

-- ============================================================
-- BILL ITEMS
-- ============================================================
CREATE TABLE bill_items (
    id              SERIAL PRIMARY KEY,
    bill_id         INTEGER NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products (id) ON DELETE SET NULL,
    product_name    VARCHAR(150),
    sku             VARCHAR(50),
    unit            VARCHAR(20) DEFAULT 'pcs',
    hsn_code        VARCHAR(20) DEFAULT '8473',
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    price           NUMERIC(12, 2) NOT NULL,
    discount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    taxable_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst_rate        NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    cgst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sgst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    igst            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_bill_items_bill ON bill_items (bill_id);
CREATE INDEX idx_bill_items_product ON bill_items (product_id);

-- ============================================================
-- SETTINGS (single row business configuration)
-- ============================================================
CREATE TABLE settings (
    id                          SERIAL PRIMARY KEY,
    business_name               VARCHAR(150) NOT NULL DEFAULT 'G - TECHNOLOGIES',
    tagline                     VARCHAR(200) DEFAULT 'CHIP LEVEL SERVICE',
    proprietor                  VARCHAR(100) DEFAULT 'GOKUL.P',
    services                    TEXT DEFAULT 'Mobile service | System service | Laptop service\nPrinter service | CCTV camera installation\nAll models chip level service',
    address                     TEXT DEFAULT 'Perumal Malai Road, Narasothipatti,\nKuranguchavadi, Salem - 636 004.',
    phone                       VARCHAR(30) DEFAULT '86108 72917',
    whatsapp                    VARCHAR(30) DEFAULT '88833 57115',
    email                       VARCHAR(150) DEFAULT 'vaalugokul63@gmail.com',
    gst_number                  VARCHAR(30),
    state                       VARCHAR(50) DEFAULT 'Tamil Nadu',
    state_code                  VARCHAR(10) DEFAULT '33',
    invoice_prefix              VARCHAR(20) DEFAULT 'INV',
    default_gst_rate            NUMERIC(5, 2) DEFAULT 18.00,
    currency                    VARCHAR(10) NOT NULL DEFAULT 'INR',
    date_format                 VARCHAR(20) NOT NULL DEFAULT 'DD-MM-YYYY',
    low_stock_threshold_percent INTEGER NOT NULL DEFAULT 100,
    terms                       TEXT DEFAULT '1. Goods / components once sold will be covered under standard warranty.\n2. Service warranty applies as per chip-level service policy.\n3. Subject to Salem jurisdiction.',
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update `updated_at` columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
