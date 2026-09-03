const { GoogleGenerativeAI } = require('@google/generative-ai');
const { extractFromPage } = require('../utils/extractor');
const { isValidUrl } = require('../utils/urlResolver');

/**
 * Initialize Gemini AI client.
 * Will be null if API key is not configured.
 */
let genAI = null;
let geminiModel = null;

const initGemini = () => {
  if (genAI) return; // Already initialized
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not configured. AI extraction will be limited.');
    return;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Gemini AI initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Gemini:', err.message);
  }
};

// Initialize on module load
initGemini();

/**
 * Use Gemini to extract structured event data from raw text.
 * Returns null if Gemini is unavailable or fails.
 * @param {string} rawText - Page text content
 * @param {object} existingData - Already-extracted data (to fill only gaps)
 * @param {string} sourceUrl - Source URL for context
 * @returns {Promise<object|null>}
 */
async function extractWithGemini(rawText, existingData, sourceUrl) {
  if (!geminiModel) return null;

  const missingFields = [];
  if (!existingData.title) missingFields.push('title');
  if (!existingData.description) missingFields.push('description');
  if (!existingData.date) missingFields.push('date (in YYYY-MM-DD format if possible)');
  if (!existingData.time) missingFields.push('time (e.g., 6:00 PM)');
  if (!existingData.location) missingFields.push('location (venue name and city)');
  if (!existingData.category) missingFields.push('category (e.g., Sports, Music, Tech, Art, Food, Education, General)');

  // If all fields are present, only ask AI to improve/validate
  const prompt = `You are an event data extraction assistant.

Analyze the following text from an event webpage and extract structured event information.

Source URL: ${sourceUrl}

Webpage text (truncated):
---
${rawText.substring(0, 3000)}
---

Already extracted data (do NOT change these if they look correct):
- Title: ${existingData.title || 'NOT FOUND'}
- Description: ${existingData.description || 'NOT FOUND'}
- Date: ${existingData.date || 'NOT FOUND'}
- Time: ${existingData.time || 'NOT FOUND'}
- Location: ${existingData.location || 'NOT FOUND'}
- Category: ${existingData.category || 'NOT FOUND'}

Your task:
1. Extract or improve: ${missingFields.length > 0 ? missingFields.join(', ') : 'validate all fields above'}
2. Do NOT invent information that is not present in the text
3. If a field is genuinely not available, return null for that field
4. For category, infer from context if possible (Sports, Music, Tech, Art, Food, Kids, Education, Business, Health, Entertainment, General)
5. Keep description concise (2-3 sentences max)

Respond ONLY with valid JSON in this exact format:
{
  "title": "event title or null",
  "description": "brief description or null",
  "date": "YYYY-MM-DD or human-readable date or null",
  "time": "time string or null",
  "location": "venue and/or city or null",
  "category": "category string or null"
}

Do not include any text outside the JSON object.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    // Validate response structure
    const allowed = ['title', 'description', 'date', 'time', 'location', 'category'];
    const validated = {};
    for (const key of allowed) {
      const val = parsed[key];
      validated[key] = typeof val === 'string' && val.trim() ? val.trim() : null;
    }

    return validated;
  } catch (err) {
    console.error('Gemini extraction error:', err.message);
    return null;
  }
}

/**
 * Merge extracted data with AI data.
 * Existing (non-null) values take priority; AI fills gaps.
 */
function mergeExtractionData(existing, aiData) {
  if (!aiData) return existing;

  const fields = ['title', 'description', 'date', 'time', 'location', 'category'];
  const merged = { ...existing };

  for (const field of fields) {
    if (!merged[field] && aiData[field]) {
      merged[field] = aiData[field];
    }
  }

  return merged;
}

/**
 * POST /api/ai/extract
 * Main extraction endpoint — fetches URL, parses HTML, uses AI for missing fields.
 *
 * Request body: { url: string }
 * Returns: structured event data
 */
const extractEvent = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an event URL.',
      });
    }

    if (!isValidUrl(url.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL. Please enter a valid http or https URL.',
      });
    }

    console.log(`📡 Extracting event from: ${url}`);

    // Step 1: Fetch and parse the webpage
    let extracted;
    try {
      extracted = await extractFromPage(url.trim());
    } catch (fetchError) {
      console.error('Page fetch error:', fetchError.message);

      // Provide a helpful error based on the type of failure
      let userMessage = 'Could not access the webpage.';
      if (fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ENOTFOUND') {
        userMessage = 'Could not reach the webpage. Please check the URL and try again.';
      } else if (fetchError.response?.status === 403) {
        userMessage =
          'Access denied by the website. Some sites block automated access. Please try a different URL or enter event details manually.';
      } else if (fetchError.response?.status === 404) {
        userMessage = 'Page not found (404). Please check the URL.';
      } else if (fetchError.code === 'ETIMEDOUT' || fetchError.code === 'ECONNABORTED') {
        userMessage = 'The webpage took too long to respond. Please try again.';
      }

      return res.status(422).json({
        success: false,
        message: userMessage,
        canManualEntry: true,
      });
    }

    // Step 2: AI extraction for missing fields
    let aiData = null;
    let aiUsed = false;

    if (extracted.needsAI && extracted.rawText) {
      console.log('🤖 Using Gemini to fill missing fields...');
      aiData = await extractWithGemini(extracted.rawText, extracted, extracted.sourceUrl);
      if (aiData) {
        aiUsed = true;
        console.log('✅ Gemini extraction successful.');
      } else {
        console.log('⚠️  Gemini extraction failed or unavailable, using HTML-only data.');
      }
    }

    // Step 3: Merge results
    const merged = mergeExtractionData(extracted, aiData);

    // Step 4: Determine extraction quality
    const fieldsFound = ['title', 'description', 'date', 'time', 'location', 'category']
      .filter((f) => merged[f])
      .length;

    const extractionQuality = fieldsFound >= 4 ? 'good' : fieldsFound >= 2 ? 'partial' : 'poor';

    let extractionNote = null;
    if (extractionQuality === 'partial') {
      extractionNote =
        'Some information could not be automatically extracted. Please review the fields below and complete any missing information.';
    } else if (extractionQuality === 'poor') {
      extractionNote =
        'Limited information was extracted from this webpage. The site may restrict automated access. Please fill in the event details manually.';
    }

    // Return clean response (no rawText or needsAI in response)
    return res.status(200).json({
      success: true,
      extractionQuality,
      extractionNote,
      aiUsed,
      event: {
        title: merged.title || null,
        description: merged.description || null,
        date: merged.date || null,
        time: merged.time || null,
        location: merged.location || null,
        category: merged.category || null,
        image: merged.image || null,
        sourceUrl: merged.sourceUrl || url.trim(),
      },
    });
  } catch (error) {
    console.error('Extract event error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during extraction. Please try again.',
    });
  }
};

module.exports = { extractEvent };
