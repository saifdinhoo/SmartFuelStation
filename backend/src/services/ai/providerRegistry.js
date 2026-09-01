// Every future provider (OpenAI, Ollama, Hugging Face, ...) registers here
// with the exact same `{ generate({ systemInstruction, messages }) }` shape
// Gemini uses below — nothing in ai.service.js, the controller, React, or
// Flutter needs to change to add one; only AI_PROVIDER and this map do.
const { CODES, providerError } = require('./providerError');
const geminiProvider = require('./providers/gemini.provider');

const PROVIDERS = {
  gemini: geminiProvider,
};

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw providerError(CODES.UNSUPPORTED_PROVIDER, `Unsupported AI_PROVIDER: ${name}`);
  }
  return provider;
}

module.exports = { getProvider };
