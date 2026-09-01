// Every Gemini-specific detail (SDK, model name, role naming, timeout
// mechanism, response shape, structured-output schema translation) lives in
// this one file. ai.service.js and everything above it only ever sees the
// generic `generate()`/`generateStructured()` contract.
const { GoogleGenAI, Type } = require('@google/genai');
const env = require('../../../config/env');
const { CODES, providerError } = require('../providerError');

// A fast, low-cost model is the right default for short assistant replies.
// Changing models is a one-line change, isolated here.
//
// gemini-2.5-flash was retired by Google ("no longer available to new
// users") and replaced with this one, discovered via live testing (Phase
// 1F) — the SDK call itself returns a 404 NOT_FOUND for the old name.
const MODEL = 'gemini-3.6-flash';
// A real live ADMIN-role request measured at ~20.3s — this model's "thinking"
// step (see MAX_OUTPUT_TOKENS below) means generation time legitimately
// varies per call and can land right at/just past a 20s ceiling even for a
// normal request, not just a stuck one. 30s gives real, slightly-slower
// calls room to finish with a genuine reply instead of being aborted into a
// controlled TIMEOUT that a faster retry would only need to repeat.
const REQUEST_TIMEOUT_MS = 30_000;
// This model line reasons before answering, and that hidden "thinking"
// output is billed against the same maxOutputTokens budget as the visible
// reply — confirmed live: a moderate diagnosis prompt alone used ~750-950
// thinking tokens before writing a single word of the actual JSON. At the
// previous budget (1024) the structured DIAGNOSIS response was silently
// truncated mid-JSON (finishReason: MAX_TOKENS), which surfaced as a
// MALFORMED_RESPONSE/502 with no indication why. This is a ceiling, not a
// forced spend — the model still stops at its own natural completion
// (finishReason: STOP), so raising it doesn't cost anything on short
// SUPPORT replies.
const MAX_OUTPUT_TOKENS = 4096;
const TEMPERATURE = 0.4;

// Built lazily (not at module load) so requiring this file never fails just
// because the key isn't set yet — the missing-key case is reported as a
// normal providerError from generate(), like every other failure mode.
let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

// Gemini has no 'assistant' role — its own turns are called 'model'. This
// mapping is the one place that naming quirk lives.
function toGeminiContents(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
}

// Translates ai.service.js's provider-agnostic JSON-Schema-like descriptor
// (plain 'string'/'array'/'object' type names, see diagnosisSchema.js) into
// Gemini's own Type-enum-based Schema shape. This is the ONLY place that
// translation happens — a future OpenAI/Ollama provider would do its own,
// and ai.service.js never imports @google/genai to build one itself.
const GENERIC_TYPE_TO_GEMINI = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
  object: Type.OBJECT,
};

function toGeminiSchema(node) {
  const schema = { type: GENERIC_TYPE_TO_GEMINI[node.type] };
  if (node.description) schema.description = node.description;
  if (node.nullable) schema.nullable = true;
  if (node.enum) {
    schema.format = 'enum';
    schema.enum = node.enum;
  }
  if (node.maxItems !== undefined) schema.maxItems = String(node.maxItems);
  if (node.items) schema.items = toGeminiSchema(node.items);
  if (node.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  if (node.required) schema.required = node.required;
  return schema;
}

// Shared by generate() and generateStructured() — everything except the
// response-parsing tail (plain text vs. JSON) is identical.
async function callGemini(systemInstruction, messages, extraConfig) {
  if (!env.geminiApiKey) {
    throw providerError(CODES.CONFIG_MISSING, 'GEMINI_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await getClient().models.generateContent({
      model: MODEL,
      contents: toGeminiContents(messages),
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        abortSignal: controller.signal,
        ...extraConfig,
      },
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw providerError(CODES.TIMEOUT, 'Gemini request timed out');
    }
    // The SDK's own error (network failure, 4xx/5xx from Gemini, etc.) is
    // deliberately not re-thrown as-is — only its message crosses this
    // boundary, and ai.service.js never forwards even that to the client.
    throw providerError(CODES.PROVIDER_ERROR, err.message || 'Gemini request failed');
  } finally {
    clearTimeout(timeout);
  }
}

async function generate({ systemInstruction, messages }) {
  const response = await callGemini(systemInstruction, messages, {});

  if (!response || !Array.isArray(response.candidates)) {
    throw providerError(CODES.MALFORMED_RESPONSE, 'Gemini returned an unexpected response shape');
  }

  const text = response.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw providerError(CODES.EMPTY_RESPONSE, 'Gemini returned an empty response');
  }

  return { text: text.trim() };
}

// Used for DIAGNOSIS: asks Gemini to return JSON conforming to `schema`
// (a generic descriptor — see diagnosisSchema.js) and parses it. The parsed
// object is returned as-is; ai.service.js is responsible for validating it
// against the same allow-lists/bounds regardless of the schema constraint,
// per "never trust model-generated JSON blindly".
async function generateStructured({ systemInstruction, messages, schema }) {
  const response = await callGemini(systemInstruction, messages, {
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(schema),
  });

  if (!response || !Array.isArray(response.candidates)) {
    throw providerError(CODES.MALFORMED_RESPONSE, 'Gemini returned an unexpected response shape');
  }

  const text = response.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw providerError(CODES.EMPTY_RESPONSE, 'Gemini returned an empty response');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw providerError(CODES.MALFORMED_RESPONSE, 'Gemini returned invalid JSON');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw providerError(CODES.MALFORMED_RESPONSE, 'Gemini returned a non-object JSON value');
  }

  return { data };
}

module.exports = { generate, generateStructured };
