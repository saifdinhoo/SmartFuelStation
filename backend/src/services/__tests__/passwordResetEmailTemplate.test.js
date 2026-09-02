const {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
} = require('../passwordResetEmailTemplate');

const RESET_URL = `http://localhost:5173/reset-password?token=${'a'.repeat(64)}`;

describe('buildPasswordResetEmailHtml', () => {
  it('includes a real Reset Password CTA linking to the exact reset URL', () => {
    const html = buildPasswordResetEmailHtml({ name: 'Layla Haddad', resetUrl: RESET_URL });

    expect(html).toContain(`href="${RESET_URL}"`);
    expect(html).toMatch(/Reset your password/i);
  });

  it('uses the resetUrl as given — built from WEB_APP_URL by the caller, not hardcoded here', () => {
    const customUrl = 'https://smartauto.example.com/reset-password?token=' + 'c'.repeat(64);
    const html = buildPasswordResetEmailHtml({ name: 'Layla', resetUrl: customUrl });

    expect(html).toContain(customUrl);
    expect(html).not.toContain('localhost');
  });

  it('states the expiry window in real terms', () => {
    const html = buildPasswordResetEmailHtml({ name: 'Layla', resetUrl: RESET_URL });

    expect(html).toMatch(/expire in 1 hour/i);
  });

  it('greets the recipient by their first name when one is available', () => {
    const html = buildPasswordResetEmailHtml({ name: 'Layla Haddad', resetUrl: RESET_URL });

    expect(html).toContain('Layla, we received a request');
    // Never the full stored name, and never a raw ", ," from a missing name.
    expect(html).not.toContain('Layla Haddad, we');
  });

  it('falls back to a generic greeting when no name is available', () => {
    const html = buildPasswordResetEmailHtml({ name: null, resetUrl: RESET_URL });

    expect(html).toContain('We received a request');
  });

  it('HTML-escapes the name — never lets a stored name inject markup', () => {
    const html = buildPasswordResetEmailHtml({
      name: '<script>alert(1)</script>',
      resetUrl: RESET_URL,
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never contains a password, JWT, or internal database id', () => {
    const html = buildPasswordResetEmailHtml({ name: 'Layla', resetUrl: RESET_URL });

    // "Reset your password" as a label is expected content; a colon-then-
    // value shape (a leaked credential, e.g. "password: hunter2") is not.
    expect(html).not.toMatch(/password\s*[:=]\s*\S/i);
    expect(html).not.toMatch(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/); // JWT shape
    expect(html).not.toMatch(/userId|user_id|"id":\s*\d+/i);
  });

  it('is real HTML with a doctype and a title, not a bare fragment', () => {
    const html = buildPasswordResetEmailHtml({ name: 'Layla', resetUrl: RESET_URL });

    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>');
  });
});

describe('buildPasswordResetEmailText', () => {
  it('is a real plain-text fallback containing the reset link and expiry notice', () => {
    const text = buildPasswordResetEmailText({ name: 'Layla Haddad', resetUrl: RESET_URL });

    expect(text).toContain(RESET_URL);
    expect(text).toMatch(/expire in 1 hour/i);
    expect(text).not.toContain('<');
  });

  it('greets the recipient by their first name when one is available', () => {
    const text = buildPasswordResetEmailText({ name: 'Layla Haddad', resetUrl: RESET_URL });

    expect(text).toContain('Layla, we received a request');
  });

  it('falls back to a generic greeting when no name is available', () => {
    const text = buildPasswordResetEmailText({ name: undefined, resetUrl: RESET_URL });

    expect(text).toContain('We received a request');
  });

  it('never contains a JWT or an internal database id (the template has no password input at all)', () => {
    const text = buildPasswordResetEmailText({ name: 'Layla', resetUrl: RESET_URL });

    expect(text).not.toMatch(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/);
    expect(text).not.toMatch(/userId|user_id/i);
  });
});
