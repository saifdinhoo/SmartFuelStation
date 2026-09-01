// Central place to read environment variables, so the rest of the app
// never calls process.env directly.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
};
