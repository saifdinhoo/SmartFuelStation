const http = require('http');
const express = require('express');
const { forgotPasswordLimiter } = require('../rateLimit');

// A real, unmocked Express server on an ephemeral port — proves the actual
// counting behavior of the real forgotPasswordLimiter middleware, not just
// that it's present in the route stack (see auth.routes.test.js for that).
// The handler behind it is a throwaway stub, not the real auth controller,
// so this never touches Prisma/the database.
let server;
let baseUrl;

beforeAll((done) => {
  const app = express();
  app.post('/forgot-password', forgotPasswordLimiter, (req, res) => {
    res.status(200).json({ success: true });
  });
  server = http.createServer(app);
  server.listen(0, () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('forgotPasswordLimiter', () => {
  // Both requirements share one exhaust-the-limit sequence — the limiter's
  // in-memory store is a module-level singleton, so a second `describe`
  // block making its own fresh set of requests would start already
  // exhausted by whichever test ran first.
  it('allows the first 5 requests from the same IP within the window, rejects the 6th with a safe 429 body, and every later request stays rejected', async () => {
    const statuses = [];
    let lastBody;
    for (let i = 0; i < 7; i += 1) {
      const res = await fetch(`${baseUrl}/forgot-password`, { method: 'POST' });
      statuses.push(res.status);
      lastBody = await res.json();
    }

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    expect(statuses[6]).toBe(429);
    // The 429 body is a static message — never reveals whether any
    // particular email exists.
    expect(lastBody).toEqual({ success: false, message: expect.any(String) });
    expect(lastBody.message.toLowerCase()).not.toContain('email');
  });
});
