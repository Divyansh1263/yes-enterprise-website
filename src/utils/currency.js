/**
 * Currency conversion and formatting utilities for INR and Paise.
 */

/**
 * Converts paise (integer) to INR (number).
 * @param {number | null | undefined} paise
 * @returns {number}
 */
export function paiseToInr(paise) {
  if (paise == null || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Converts INR (number or string) to paise (integer).
 * @param {number | string | null | undefined} inr
 * @returns {number}
 */
export function inrToPaise(inr) {
  if (inr == null || inr === '') return 0;
  const num = typeof inr === 'string' ? parseFloat(inr) : inr;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Calculates wholesale price per piece in INR from expected_price_per_100_paise.
 * Formula: (expected_price_per_100_paise / 100) / 100 = expected_price_per_100_paise / 10000
 * @param {number | null | undefined} expPrice100Paise
 * @returns {number | null}
 */
export function expPrice100PaiseToPieceInr(expPrice100Paise) {
  if (expPrice100Paise == null || isNaN(expPrice100Paise) || expPrice100Paise <= 0) return null;
  return Number((expPrice100Paise / 10000).toFixed(2));
}


/**
 * Formats a price in paise as a formatted INR string (e.g. ₹ 1,250).
 * @param {number | null | undefined} paise
 * @param {boolean} [showDecimals=false]
 * @returns {string}
 */
export function formatInr(paise, showDecimals = false) {
  if (paise == null || isNaN(paise)) return '₹ 0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(rupees);
}

