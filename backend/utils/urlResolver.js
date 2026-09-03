const { URL } = require('url');

/**
 * URL Resolution Utility
 * Converts relative URLs to absolute URLs based on the source page URL.
 */

/**
 * Resolve a potentially-relative URL against a base URL.
 * @param {string} href - The URL to resolve (may be relative)
 * @param {string} baseUrl - The source page URL
 * @returns {string|null} - Absolute URL or null if invalid
 */
function resolveUrl(href, baseUrl) {
  if (!href || typeof href !== 'string') return null;

  href = href.trim();
  if (!href) return null;

  // Already absolute
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  // Protocol-relative
  if (href.startsWith('//')) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}${href}`;
    } catch {
      return `https:${href}`;
    }
  }

  // Data URIs — return as-is
  if (href.startsWith('data:')) {
    return href;
  }

  // Relative URL — resolve against base
  try {
    const resolved = new URL(href, baseUrl);
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Extract origin from a URL (e.g., "https://example.com")
 * @param {string} url
 * @returns {string|null}
 */
function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Validate that a string is a valid HTTP/HTTPS URL.
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { resolveUrl, getOrigin, isValidUrl };
