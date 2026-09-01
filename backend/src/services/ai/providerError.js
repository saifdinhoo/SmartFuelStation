// Shared error-code vocabulary every provider adapter (Gemini today, others
// later) uses to signal a failure back to ai.service.js. This is what keeps
// the service layer provider-agnostic: it maps a `code` to an HTTP status
// and a safe message without ever seeing that provider's raw SDK exception
// shape, so a future OpenAI/Ollama/Hugging Face adapter only has to raise
// one of these same codes to plug into the exact same handling.
const CODES = {
  CONFIG_MISSING: 'CONFIG_MISSING',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
};

function providerError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

module.exports = { CODES, providerError };
