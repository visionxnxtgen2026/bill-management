# StockPro — Stock Management + Billing System

A complete, local Stock Management and Billing system for a single-shop business.
React (Vite + Tailwind) frontend, Express + PostgreSQL backend, no cloud services.

## Features

- Product catalog with categories, pricing, images, and low/out-of-stock detection
- Stock In / Stock Out with a full audit trail (`stock_transactions`)
- POS-style Billing screen that generates invoices and automatically reduces stock
- Printable invoice
- Dashboard with KPIs and a 7-day stock movement chart
- Reports: Stock Summary, Stock History, Low Stock, Out of Stock, Sales (with CSV export)
- Supplier management, including each supplier's products and purchase history
- Settings for business info used on invoices

All stock-changing operations (Stock In, Stock Out, Billing) run inside PostgreSQL
transactions with row locking, so stock can never go negative and every change is
recorded in `stock_transactions`.

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally

## 1. Create the database

```bash
createdb stock_management
psql -d stock_management -f database/schema.sql
psql -d stock_management -f database/seed.sql   # optional sample data
```

(Adjust the connection details below if your PostgreSQL user/password differ.)

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env if your DATABASE_URL differs from the default
npm install
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET /api/health`.

## 3. Frontend setup

In a new terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Project structure

```
stock-management/
├── client/     React + Vite + Tailwind frontend
├── server/     Express + PostgreSQL REST API
└── database/   schema.sql and seed.sql
```

## Notes

- No authentication, cloud database, or external services are used — this is
  designed to run entirely on one local machine.
- Product images are stored as base64 data URLs directly in the database
  (no file storage service required).
- To reset the database at any point, re-run `schema.sql` (it drops and
  recreates all tables) followed by `seed.sql` if you want sample data.
