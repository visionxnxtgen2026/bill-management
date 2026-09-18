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

// Serverless path normalization middleware:
// If Vercel passed the serverless file path in req.url (e.g. /src/app.js?type=all or /api/index.js),
// restore the actual intended path from request headers or query.
app.use((req, res, next) => {
  if (req.url.startsWith('/src/app.js') || req.url.startsWith('/api/index.js') || req.url.startsWith('/api/index')) {
    const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches'];
    if (matchedPath && !matchedPath.startsWith('/src/app.js') && !matchedPath.startsWith('/api/index')) {
      req.url = matchedPath;
    }
  }
  next();
});

// Root & Health endpoints
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'StockPro API',
    time: new Date().toISOString(),
  });
});

// Dual-mount routes: supports both /api/<resource> and /<resource>
app.use(['/api/products', '/products'], productsRoutes);
app.use(['/api/suppliers', '/suppliers'], suppliersRoutes);
app.use(['/api/stock', '/stock'], stockRoutes);
app.use(['/api/bills', '/bills'], billsRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/reports', '/reports'], reportsRoutes);
app.use(['/api/settings', '/settings'], settingsRoutes);

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
