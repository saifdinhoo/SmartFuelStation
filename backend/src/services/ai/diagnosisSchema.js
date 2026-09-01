// The DIAGNOSIS response contract — allow-listed enums, bounds, and a
// provider-agnostic JSON-Schema-like descriptor for structured output.
//
// This file never imports @google/genai. It describes what AiService wants
// using plain type strings ('string'/'array'/'object'), and it is
// GeminiAiProvider's job to translate that into its own Schema/Type API —
// see toGeminiSchema() there. A future OpenAI/Ollama provider would do its
// own translation of this exact same descriptor.

const URGENCY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
const LIKELIHOOD_VALUES = ['LIKELY', 'POSSIBLE', 'LESS_LIKELY'];
const SUGGESTED_ACTIONS = ['FIND_PROVIDER', 'SEEK_IMMEDIATE_HELP', 'NONE'];

// A model recommending "no real category fits yet" uses this literal
// string — never null directly, since responseSchema enum values must be
// strings. ai.service.js turns this back into a real null.
const NONE_CATEGORY = 'NONE';

const MAX_POSSIBLE_CAUSES = 5;
const MAX_REPLY_LENGTH = 3000;
const MAX_CAUSE_NAME_LENGTH = 200;
const MAX_EXPLANATION_LENGTH = 600;
const MAX_SAFETY_ADVICE_LENGTH = 1000;
const MAX_FOLLOWUP_LENGTH = 300;

function buildDiagnosisResponseSchema(categoryNames) {
  return {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description:
          "A natural-language reply to the user in the requested language, summarizing the possible causes and any safety advice in plain terms. Never state a diagnosis as certain — use words like 'possible', 'may indicate', 'could be caused by', 'likely based on the symptoms described'.",
      },
      urgency: { type: 'string', enum: URGENCY_VALUES },
      possibleCauses: {
        type: 'array',
        maxItems: MAX_POSSIBLE_CAUSES,
        description:
          'Leave this empty if the symptoms described are too vague to suggest any real cause — ask a follow-up question instead of guessing.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            likelihood: { type: 'string', enum: LIKELIHOOD_VALUES },
            explanation: { type: 'string' },
          },
          required: ['name', 'likelihood', 'explanation'],
        },
      },
      recommendedServiceCategory: {
        type: 'string',
        enum: [...categoryNames, NONE_CATEGORY],
        description: `The single best-matching category from this real list of categories this platform actually offers, or exactly "${NONE_CATEGORY}" if there is not enough information yet or nothing on the list fits.`,
      },
      safetyAdvice: {
        type: 'string',
        nullable: true,
        description: 'Only set this when the symptoms are safety-relevant; otherwise omit/null.',
      },
      followUpQuestion: {
        type: 'string',
        nullable: true,
        description: 'A single focused question to ask when possibleCauses is empty because the symptoms are too vague. Null otherwise.',
      },
    },
    required: ['reply', 'urgency', 'possibleCauses', 'recommendedServiceCategory'],
  };
}

module.exports = {
  URGENCY_VALUES,
  LIKELIHOOD_VALUES,
  SUGGESTED_ACTIONS,
  NONE_CATEGORY,
  MAX_POSSIBLE_CAUSES,
  MAX_REPLY_LENGTH,
  MAX_CAUSE_NAME_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_SAFETY_ADVICE_LENGTH,
  MAX_FOLLOWUP_LENGTH,
  buildDiagnosisResponseSchema,
};
