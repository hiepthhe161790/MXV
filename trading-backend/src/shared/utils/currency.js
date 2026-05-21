/**
 * Currency Utilities
 * Handles floating-point precision for financial calculations
 */

/**
 * Round money value to 4 decimal places (to prevent floating-point errors)
 * @param {number} value - The value to round
 * @returns {number} Rounded value
 */
function roundToMoneyPrecision(value) {
  if (typeof value !== 'number') {
    throw new Error('Value must be a number');
  }
  // Round to 4 decimal places: multiply by 10000, round, divide by 10000
  return Math.round(value * 10000) / 10000;
}

/**
 * Add two money values with proper precision
 * @param {number} a - First value
 * @param {number} b - Second value
 * @returns {number} Sum with proper precision
 */
function addMoney(a, b) {
  return roundToMoneyPrecision(a + b);
}

/**
 * Subtract two money values with proper precision
 * @param {number} a - First value
 * @param {number} b - Second value
 * @returns {number} Difference with proper precision
 */
function subtractMoney(a, b) {
  return roundToMoneyPrecision(a - b);
}

/**
 * Calculate margin required with proper precision
 * @param {number} quantity - Order quantity
 * @param {number} price - Order price
 * @param {number} leverage - Leverage factor (default 10)
 * @returns {number} Margin required
 */
function calculateMarginRequired(quantity, price, leverage = 10) {
  const margin = (quantity * price) / leverage;
  return roundToMoneyPrecision(margin);
}

module.exports = {
  roundToMoneyPrecision,
  addMoney,
  subtractMoney,
  calculateMarginRequired,
};
