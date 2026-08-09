const translateService = require('../services/translate.service');

async function translate(req, res, next) {
  try {
    const translatedText = await translateService.translateToArabic(req.body.text);
    res.json({ success: true, data: { original: req.body.text, translated: translatedText, targetLanguage: 'ar' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { translate };
