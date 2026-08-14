const { googleTranslateApiKey } = require('../config/env');

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function translateToArabic(text) {
  if (!text || !text.trim()) {
    throw badRequest('text is required');
  }

  if (!googleTranslateApiKey) {
    const err = new Error('Translation is not configured: GOOGLE_TRANSLATE_API_KEY is missing');
    err.statusCode = 503;
    throw err;
  }

  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${googleTranslateApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'ar', format: 'text' }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const err = new Error(payload.error?.message || 'Translation request failed');
    err.statusCode = response.status === 400 ? 502 : response.status;
    throw err;
  }

  return payload.data.translations[0].translatedText;
}

module.exports = { translateToArabic };
