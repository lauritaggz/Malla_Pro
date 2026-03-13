/**
 * Parses a grade input string or number into a valid float between 1.0 and 7.0.
 * Handles:
 * - Commas (e.g., "5,5" -> 5.5)
 * - Whole numbers without decimals (e.g., "55" -> 5.5, "7" -> 7.0)
 * - Standard dots (e.g., "5.5" -> 5.5)
 * 
 * @param {string|number} val The value to parse
 * @returns {number|null} The parsed grade or null if invalid
 */
export const parseGrade = (val) => {
  if (val === null || val === undefined || val === "") return null;

  // Convert to string and handle basic replacement
  let str = String(val).trim().replace(",", ".");

  // If it's a number like "55" or "40", convert to "5.5" or "4.0"
  if (/^\d{2}$/.test(str)) {
    str = (parseFloat(str) / 10).toFixed(1);
  }

  const num = parseFloat(str);

  if (isNaN(num)) return null;

  // Clamp between 1.0 and 7.0
  return Math.max(1.0, Math.min(7.0, parseFloat(num.toFixed(1))));
};
