const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  // Real SDK enum values are the string names themselves — mirrored here so
  // toGeminiSchema()'s translation is checkable against real-looking output.
  Type: {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    NULL: 'NULL',
  },
}));

// A plain mutable object, not a snapshot — gemini.provider.js reads
// `env.geminiApiKey` live on every call, so a test can flip it and the
// very next generate() call sees the change.
const env = { geminiApiKey: 'test-key' };
jest.mock('../../../../config/env', () => env);

const { GoogleGenAI } = require('@google/genai');
const { CODES } = require('../../providerError');
const gemini = require('../gemini.provider');

beforeEach(() => {
  jest.clearAllMocks();
  env.geminiApiKey = 'test-key';
});

describe('generate — happy path', () => {
  it('maps assistant/user roles onto Gemini contents, returns trimmed text, and uses the configured key', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{}],
      text: '  Here you go.  ',
    });

    const result = await gemini.generate({
      systemInstruction: 'You are the assistant.',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'How do I cancel a booking?' },
      ],
    });

    expect(result).toEqual({ text: 'Here you go.' });

    const [request] = mockGenerateContent.mock.calls[0];
    expect(request.config.systemInstruction).toBe('You are the assistant.');
    expect(request.contents).toEqual([
      { role: 'user', parts: [{ text: 'Hi' }] },
      // 'assistant' becomes 'model' — Gemini has no 'assistant' role.
      { role: 'model', parts: [{ text: 'Hello!' }] },
      { role: 'user', parts: [{ text: 'How do I cancel a booking?' }] },
    ]);

    // The client is a lazily-created singleton, so its construction args are
    // only checked here, on whichever test happens to trigger creation first.
    expect(GoogleGenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'test-key' }));
  });
});

describe('generate — failure mapping', () => {
  it('throws CONFIG_MISSING when GEMINI_API_KEY is not set, without calling the SDK', async () => {
    env.geminiApiKey = '';
    await expect(
      gemini.generate({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: CODES.CONFIG_MISSING });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('throws PROVIDER_ERROR on an SDK failure, without leaking the raw error upward unmapped', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 Service Unavailable from Gemini'));
    await expect(
      gemini.generate({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: CODES.PROVIDER_ERROR });
  });

  it('throws MALFORMED_RESPONSE when the response has no candidates array', async () => {
    mockGenerateContent.mockResolvedValue({});
    await expect(
      gemini.generate({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws EMPTY_RESPONSE when text is blank', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: '   ' });
    await expect(
      gemini.generate({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: CODES.EMPTY_RESPONSE });
  });

  it('throws EMPTY_RESPONSE when text is undefined', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}] });
    await expect(
      gemini.generate({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ code: CODES.EMPTY_RESPONSE });
  });

  it('throws TIMEOUT when the request exceeds the deadline, without a real 30s wait', async () => {
    jest.useFakeTimers();
    try {
      mockGenerateContent.mockImplementation((request) => {
        return new Promise((_resolve, reject) => {
          request.config.abortSignal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const promise = gemini.generate({
        systemInstruction: 's',
        messages: [{ role: 'user', content: 'hi' }],
      });
      // Attach the assertion's handler immediately — before advancing time
      // — so the rejection that fires mid-advance is never briefly
      // unhandled (which Jest would otherwise report as a test failure).
      const assertion = expect(promise).rejects.toMatchObject({ code: CODES.TIMEOUT });
      await jest.advanceTimersByTimeAsync(30_000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('does NOT abort at the old 20s deadline — the timeout is specifically 30s, not left over from before', async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      mockGenerateContent.mockImplementation((request) => {
        return new Promise((_resolve, reject) => {
          request.config.abortSignal.addEventListener('abort', () => {
            aborted = true;
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const promise = gemini.generate({
        systemInstruction: 's',
        messages: [{ role: 'user', content: 'hi' }],
      });
      const assertion = expect(promise).rejects.toMatchObject({ code: CODES.TIMEOUT });

      await jest.advanceTimersByTimeAsync(29_999);
      expect(aborted).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(aborted).toBe(true);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('generateStructured — happy path', () => {
  it('requests JSON output with a translated schema and parses the result', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{}],
      text: '{"reply":"ok","urgency":"LOW"}',
    });

    const schema = {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        urgency: { type: 'string', enum: ['LOW', 'HIGH'] },
      },
      required: ['reply', 'urgency'],
    };

    const result = await gemini.generateStructured({
      systemInstruction: 'You are the diagnosis assistant.',
      messages: [{ role: 'user', content: 'My brakes are grinding.' }],
      schema,
    });

    expect(result).toEqual({ data: { reply: 'ok', urgency: 'LOW' } });

    const [request] = mockGenerateContent.mock.calls[0];
    expect(request.config.responseMimeType).toBe('application/json');
    // The generic 'string'/'object' descriptor is translated into Gemini's
    // own Type-enum-based Schema shape — this translation happens ONLY
    // here, never in ai.service.js.
    expect(request.config.responseSchema).toEqual({
      type: 'OBJECT',
      properties: {
        reply: { type: 'STRING' },
        urgency: { type: 'STRING', format: 'enum', enum: ['LOW', 'HIGH'] },
      },
      required: ['reply', 'urgency'],
    });
  });

  it('translates nested array/object schemas, nullable fields, and maxItems', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: '{}' });

    const schema = {
      type: 'object',
      properties: {
        possibleCauses: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
        safetyAdvice: { type: 'string', nullable: true },
      },
    };

    await gemini.generateStructured({
      systemInstruction: 's',
      messages: [{ role: 'user', content: 'x' }],
      schema,
    });

    const [request] = mockGenerateContent.mock.calls[0];
    expect(request.config.responseSchema).toEqual({
      type: 'OBJECT',
      properties: {
        possibleCauses: {
          type: 'ARRAY',
          // Gemini's Schema.maxItems is a string, not a number.
          maxItems: '5',
          items: {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' } },
            required: ['name'],
          },
        },
        safetyAdvice: { type: 'STRING', nullable: true },
      },
    });
  });
});

describe('generateStructured — failure mapping', () => {
  const schema = { type: 'object', properties: { reply: { type: 'string' } } };

  it('throws CONFIG_MISSING when GEMINI_API_KEY is not set, without calling the SDK', async () => {
    env.geminiApiKey = '';
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.CONFIG_MISSING });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('throws MALFORMED_RESPONSE on invalid JSON text', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: 'not json' });
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws MALFORMED_RESPONSE on JSON truncated mid-generation (MAX_TOKENS cutoff) rather than crashing', async () => {
    // Realistic shape of a real failure found via live testing (Phase 1F):
    // a "thinking" model can spend most of maxOutputTokens on hidden
    // reasoning before writing the visible JSON, and if the budget runs out
    // mid-object the SDK still resolves normally with finishReason
    // MAX_TOKENS and a syntactically-incomplete `text` — never a rejected
    // promise, so this has to be caught by the JSON.parse guard, not a
    // network-level error path.
    const truncated =
      '{"reply":"ok","urgency":"HIGH","possibleCauses":[],' +
      '"recommendedServiceCategory":"Brake Inspection","safetyAdvice":"Stop driving and seek';
    mockGenerateContent.mockResolvedValue({
      candidates: [{ finishReason: 'MAX_TOKENS' }],
      text: truncated,
    });
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws MALFORMED_RESPONSE when the JSON parses to an array', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: '["a","b"]' });
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws MALFORMED_RESPONSE when the JSON parses to a primitive', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: '42' });
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws EMPTY_RESPONSE when text is blank', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [{}], text: '   ' });
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.EMPTY_RESPONSE });
  });

  it('throws MALFORMED_RESPONSE when the response has no candidates array', async () => {
    mockGenerateContent.mockResolvedValue({});
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.MALFORMED_RESPONSE });
  });

  it('throws PROVIDER_ERROR on an SDK failure, without leaking the raw error upward unmapped', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 Service Unavailable from Gemini'));
    await expect(
      gemini.generateStructured({ systemInstruction: 's', messages: [{ role: 'user', content: 'hi' }], schema }),
    ).rejects.toMatchObject({ code: CODES.PROVIDER_ERROR });
  });

  it('throws TIMEOUT when the request exceeds the deadline, without a real 30s wait', async () => {
    jest.useFakeTimers();
    try {
      mockGenerateContent.mockImplementation((request) => {
        return new Promise((_resolve, reject) => {
          request.config.abortSignal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const promise = gemini.generateStructured({
        systemInstruction: 's',
        messages: [{ role: 'user', content: 'hi' }],
        schema,
      });
      const assertion = expect(promise).rejects.toMatchObject({ code: CODES.TIMEOUT });
      await jest.advanceTimersByTimeAsync(30_000);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
