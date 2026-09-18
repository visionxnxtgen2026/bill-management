/**
 * AppError — a known, user-facing error.
 * Anything thrown that is NOT an AppError is treated as an unexpected
 * server/database error and never leaks its raw message to the client.
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

// Wraps async route handlers so thrown/rejected errors reach errorHandler.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.isAppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // PostgreSQL unique_violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  // PostgreSQL foreign_key_violation
  if (err.code === '23503') {
    return res.status(409).json({ error: 'This record is referenced by other data and cannot be modified.' });
  }
  // PostgreSQL check_violation (e.g. negative stock/price constraints)
  if (err.code === '23514') {
    return res.status(400).json({ error: 'The value provided is not valid for this field.' });
  }
  // Database connection issues
  if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.code === '3D000') {
    console.error(`[DATABASE ERROR] ${req.method} ${req.originalUrl} - Code: ${err.code}:`, err.message);
    return res.status(503).json({ error: `Database connection error (${err.message}). Check database configuration.` });
  }

  console.error(`[API ERROR] ${req.method} ${req.originalUrl} -`, err);
  return res.status(500).json({ error: err.message || 'Something went wrong on the server. Please try again.' });
}

module.exports = { AppError, asyncHandler, notFoundHandler, errorHandler };
