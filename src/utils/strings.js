/**
 * Common string manipulation and sanitization utilities
 */

/**
 * Escapes special HTML characters to prevent XSS injection in HTML strings.
 * @param {string|any} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Escapes characters for safe inclusion inside HTML attributes.
 * @param {string|any} value
 * @returns {string}
 */
export function escapeAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
