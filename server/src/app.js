require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const productsRoutes = require('./routes/products');
const suppliersRoutes = require('./routes/suppliers');
const stockRoutes = require('./routes/stock');
const billsRoutes = require('./routes/bills');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const { getMaskedConnectionInfo } = require('./db/pool');

const app = express();

const rawOrigin = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = rawOrigin.includes(',')
  ? rawOrigin.split(',').map((o) => o.trim())
  : [rawOrigin];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server) or matching allowed origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/products', productsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StockPro API running on http://localhost:${PORT}`);
    console.log(`Database connected via: ${getMaskedConnectionInfo()}`);
  });
}

module.exports = app;
