/**
 * Date Parsing Utility
 * Supports many human-readable formats used in event pages.
 */

/**
 * Parse a date string into a JS Date object.
 * Returns null if the date cannot be reliably parsed.
 * @param {string} dateStr - Raw date string from webpage/AI
 * @returns {Date|null}
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try native Date parsing first
  const native = new Date(cleaned);
  if (!isNaN(native.getTime())) return native;

  // Manual patterns
  const patterns = [
    // "23 Aug 2026", "23 August 2026"
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
    // "Aug 23, 2026", "August 23, 2026"
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
    // "Sun, 23 Aug, 2026" / "Sun, 23 Aug 2026"
    /^[A-Za-z]+,\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/,
    // "23/08/2026" or "08/23/2026"
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // "2026/08/23"
    /^(\d{4})\/(\d{2})\/(\d{2})$/,
  ];

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let day, month, year;

      if (pattern === patterns[0]) {
        // "23 Aug 2026"
        day = parseInt(match[1]);
        month = months[match[2].toLowerCase().substring(0, 3)];
        year = parseInt(match[3]);
      } else if (pattern === patterns[1]) {
        // "Aug 23, 2026"
        month = months[match[1].toLowerCase().substring(0, 3)];
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      } else if (pattern === patterns[2]) {
        // "Sun, 23 Aug, 2026"
        day = parseInt(match[1]);
        month = months[match[2].toLowerCase().substring(0, 3)];
        year = parseInt(match[3]);
      } else if (pattern === patterns[3]) {
        // "23/08/2026" — assume DD/MM/YYYY for non-US
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
      } else if (pattern === patterns[4]) {
        // "2026/08/23"
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      }

      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

/**
 * Format a Date object into a human-readable string.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Normalize a date string — parse and re-format consistently.
 * Returns the original string if it cannot be parsed.
 * @param {string} dateStr
 * @returns {string}
 */
function normalizeDate(dateStr) {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr || '';
  return parsed.toISOString().split('T')[0]; // YYYY-MM-DD
}

module.exports = { parseDate, formatDate, normalizeDate };
