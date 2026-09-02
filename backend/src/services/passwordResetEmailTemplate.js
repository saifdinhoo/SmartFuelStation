// The password-reset email's content, kept separate from email.service.js
// (which only handles transport) so the template itself is easy to read
// and to test in isolation.
//
// Table-based layout with every style inline, on purpose — this is what
// actually renders consistently across real-world email clients (Outlook
// desktop uses Word's rendering engine and largely ignores <div>/flexbox/
// grid/box-shadow; a <style> block is not reliable either since some
// clients strip <head>). The one exception is the small <style> block
// below, which only resets link color/underline as a progressive
// enhancement — every property that actually matters is also inline.

const BRAND_NAME = 'Smart Automotive Service Platform';
const BG_CANVAS = '#141414';
const BG_HEADER = '#0e0e0e';
const BG_CARD = '#1f1f1f';
const BORDER_CARD = '#333333';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_MUTED = '#a8a8a8';
const ACCENT = '#0d9488';
const ACCENT_TEXT = '#ffffff';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// First token of the stored name, e.g. "Layla Haddad" -> "Layla" — falls
// back to a generic greeting when there's nothing sensible to split (an
// empty/whitespace-only name is not expected in practice, but this never
// renders a broken-looking "Hi ," either way).
function firstNameOf(fullName) {
  const trimmed = typeof fullName === 'string' ? fullName.trim() : '';
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function buildPasswordResetEmailHtml({ name, resetUrl }) {
  const firstName = firstNameOf(name);
  const greeting = firstName ? `${escapeHtml(firstName)}, we` : 'We';
  const safeResetUrl = escapeHtml(resetUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>Reset your password</title>
<style>
  a { color: ${ACCENT}; }
  @media (max-width: 480px) {
    .container { width: 100% !important; }
    .card-padding { padding: 24px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${BG_CANVAS};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_CANVAS};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" class="container" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px; max-width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${BG_HEADER}" style="background-color:${BG_HEADER}; padding:28px 24px;">
              <span style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:${TEXT_PRIMARY}; letter-spacing:0.2px;">
                ${escapeHtml(BRAND_NAME)}
              </span>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px; line-height:24px; font-size:0;">&nbsp;</td></tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${BG_CARD}" style="background-color:${BG_CARD}; border:1px solid ${BORDER_CARD}; border-radius:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="card-padding" style="padding:36px 32px; font-family:Arial,Helvetica,sans-serif;">

                    <h1 style="margin:0 0 20px 0; font-size:24px; line-height:1.3; font-weight:bold; color:${TEXT_PRIMARY}; text-align:center;">
                      Reset Your Password
                    </h1>

                    <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:${TEXT_MUTED};">
                      ${greeting} received a request to reset the password for your ${escapeHtml(BRAND_NAME)} account.
                    </p>

                    <!-- Bulletproof button: a table cell carries the background/padding, since a
                         plain <a> styled as a button loses both in Outlook desktop. -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="${ACCENT}" style="background-color:${ACCENT}; border-radius:6px;">
                          <a href="${safeResetUrl}"
                             style="display:inline-block; padding:14px 28px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:${ACCENT_TEXT}; text-decoration:none; border-radius:6px;">
                            Reset your password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:28px 0 0 0; font-size:14px; line-height:1.6; color:${TEXT_MUTED};">
                      <strong style="color:${TEXT_PRIMARY};">This link will expire in 1 hour.</strong>
                      If you did not request a password reset, you can safely ignore this email — your
                      password will not be changed.
                    </p>

                    <p style="margin:16px 0 0 0; font-size:14px; line-height:1.6; color:${TEXT_MUTED};">
                      Having trouble with the button? Copy and paste this link into your browser:<br>
                      <span style="word-break:break-all; color:${TEXT_MUTED};">${safeResetUrl}</span>
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:24px; line-height:24px; font-size:0;">&nbsp;</td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 24px 32px 24px; font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:${TEXT_MUTED};">
                You're receiving this email because a password reset was requested for your
                ${escapeHtml(BRAND_NAME)} account.
              </p>
              <p style="margin:8px 0 0 0; font-size:12px; line-height:1.6; color:${TEXT_MUTED};">
                ${escapeHtml(BRAND_NAME)} &middot; automated message, please do not reply
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmailText({ name, resetUrl }) {
  const firstName = firstNameOf(name);
  const greeting = firstName ? `${firstName}, we` : 'We';

  return [
    BRAND_NAME,
    '',
    'Reset Your Password',
    '',
    `${greeting} received a request to reset the password for your ${BRAND_NAME} account.`,
    '',
    `Reset your password: ${resetUrl}`,
    '',
    'This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will not be changed.',
    '',
    `You're receiving this email because a password reset was requested for your ${BRAND_NAME} account.`,
    `${BRAND_NAME} — automated message, please do not reply`,
  ].join('\n');
}

module.exports = { buildPasswordResetEmailHtml, buildPasswordResetEmailText };
