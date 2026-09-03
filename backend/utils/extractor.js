const axios = require('axios');
const cheerio = require('cheerio');
const { resolveUrl, isValidUrl } = require('./urlResolver');

/**
 * Webpage Extraction Pipeline
 * Fetches a URL and extracts structured event metadata using:
 * 1. Open Graph tags
 * 2. Twitter Card tags
 * 3. Standard meta tags
 * 4. HTML content analysis
 */

/**
 * Fetch webpage HTML from a URL with browser-like headers.
 * @param {string} url
 * @returns {Promise<{html: string, finalUrl: string}>}
 */
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    responseType: 'text',
  });

  return {
    html: response.data,
    finalUrl: response.config?.url || url,
  };
}

/**
 * Extract a meta tag content value.
 * Tries multiple attribute selectors.
 */
function getMeta($, ...selectors) {
  for (const selector of selectors) {
    const content = $(selector).attr('content');
    if (content && content.trim()) return content.trim();
  }
  return null;
}

/**
 * Extract structured event data from a webpage using Cheerio.
 * @param {string} url - The event page URL
 * @returns {Promise<object>} - Partial event data extracted from the page
 */
async function extractFromPage(url) {
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided. Please enter a valid http/https URL.');
  }

  const { html, finalUrl } = await fetchPage(url);
  const $ = cheerio.load(html);

  // ── TITLE ────────────────────────────────────────────────────────────────
  const title =
    getMeta($, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    null;

  // ── DESCRIPTION ──────────────────────────────────────────────────────────
  const description =
    getMeta(
      $,
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ) ||
    $('article p').first().text().trim() ||
    $('main p').first().text().trim() ||
    $('p').first().text().trim() ||
    null;

  // ── IMAGE ─────────────────────────────────────────────────────────────────
  const rawImage =
    getMeta($, 'meta[property="og:image"]', 'meta[name="twitter:image"]') ||
    $('img[src]').first().attr('src') ||
    null;

  const image = rawImage ? resolveUrl(rawImage, finalUrl) : null;

  // ── DATE ──────────────────────────────────────────────────────────────────
  // Try schema.org structured data first
  let date = null;
  let time = null;

  // JSON-LD structured data
  $('script[type="application/ld+json"]').each((i, el) => {
    if (date && time) return;
    try {
      const json = JSON.parse($(el).html());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const type = item['@type'] || '';
        if (
          type === 'Event' ||
          type === 'MusicEvent' ||
          type === 'SportsEvent' ||
          type === 'SocialEvent'
        ) {
          if (item.startDate && !date) {
            const sd = item.startDate;
            // May include time: "2026-08-23T18:00:00"
            if (sd.includes('T')) {
              const [datePart, timePart] = sd.split('T');
              date = datePart;
              if (!time && timePart) {
                const [h, m] = timePart.split(':');
                const hr = parseInt(h);
                const ampm = hr >= 12 ? 'PM' : 'AM';
                const hr12 = hr % 12 || 12;
                time = `${hr12}:${m} ${ampm}`;
              }
            } else {
              date = sd;
            }
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  });

  // Try OG/meta date tags
  if (!date) {
    date =
      getMeta(
        $,
        'meta[property="event:start_time"]',
        'meta[name="event:start_time"]',
        'meta[itemprop="startDate"]',
        'meta[property="og:start_time"]'
      ) || null;
  }

  // ── LOCATION ──────────────────────────────────────────────────────────────
  let location = null;

  $('script[type="application/ld+json"]').each((i, el) => {
    if (location) return;
    try {
      const json = JSON.parse($(el).html());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item.location) {
          const loc = item.location;
          if (typeof loc === 'string') {
            location = loc;
          } else if (loc.name) {
            location = [loc.name, loc.address?.streetAddress, loc.address?.addressLocality]
              .filter(Boolean)
              .join(', ');
          }
        }
      }
    } catch {
      // Skip malformed
    }
  });

  if (!location) {
    location =
      getMeta($, 'meta[property="event:location"]', 'meta[name="geo.placename"]') ||
      null;
  }

  // ── CATEGORY ──────────────────────────────────────────────────────────────
  const category =
    getMeta($, 'meta[property="event:category"]', 'meta[name="category"]') || null;

  // ── RAW TEXT for AI fallback ──────────────────────────────────────────────
  // Collect meaningful text from the page (limit to ~3000 chars)
  const bodyText = $('body')
    .clone()
    .find('script, style, noscript, nav, footer, header, iframe')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000);

  return {
    title: title || null,
    description: description || null,
    date: date || null,
    time: time || null,
    location: location || null,
    category: category || null,
    image: image || null,
    sourceUrl: finalUrl,
    rawText: bodyText,
    // Determine which fields need AI help
    needsAI: !title || !description || !date || !location,
  };
}

module.exports = { extractFromPage, fetchPage };
