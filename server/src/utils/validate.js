const { AppError } = require('../middleware/errorHandler');

function requireString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required.`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireNumber(value, fieldName, { allowZero = true, min = null } = {}) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new AppError(`${fieldName} must be a valid number.`);
  }
  if (!allowZero && num === 0) {
    throw new AppError(`${fieldName} cannot be zero.`);
  }
  if (min !== null && num < min) {
    throw new AppError(`${fieldName} cannot be less than ${min}.`);
  }
  return num;
}

function requirePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${fieldName} must be a whole number greater than 0.`);
  }
  return num;
}

function requireNonNegativeNumber(value, fieldName) {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    throw new AppError(`${fieldName} cannot be negative.`);
  }
  return num;
}

module.exports = {
  requireString,
  optionalString,
  requireNumber,
  requirePositiveInt,
  requireNonNegativeNumber,
};
