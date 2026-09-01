// The only place a real email is ever sent from. Gmail SMTP via
// nodemailer, chosen for this project because it needs no domain
// verification or paid tier — any Gmail account with an "App Password"
// works immediately (see .env.example).
//
// Built lazily (not at module load) so requiring this file never fails
// just because the credentials aren't set yet.
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    });
  }
  return transporter;
}

function isConfigured() {
  return Boolean(env.gmailUser && env.gmailAppPassword);
}

// Safe to call anywhere, any number of times: reports only whether delivery
// is configured, never a credential value, a partial value, or a length.
// Called once at server startup (see server.js) so this is visible in the
// log without needing to trigger a real reset request first.
function logConfigStatus() {
  if (isConfigured()) {
    console.log('[email] Password reset email delivery is configured (Gmail SMTP).');
  } else {
    console.warn(
      '[email] Password reset email delivery is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env to enable it.',
    );
  }
}

// Never throws — a caller must not fail the whole request just because
// email delivery failed; the token itself is already persisted either way.
// Never logs the raw token or the full reset URL, on any path (configured,
// unconfigured, or a failed send) — a leaked reset link is a live
// credential, so it gets no more exposure than the recipient's own inbox.
async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!isConfigured()) return;

  try {
    await getTransporter().sendMail({
      from: env.gmailUser,
      to,
      subject: 'Reset your Smart Automotive Service Platform password',
      text: `We received a request to reset your password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    // err.message is nodemailer's own transport error (e.g. an SMTP auth
    // failure code) — never the credentials or the token/URL themselves.
    console.error('[email] Failed to send password reset email:', err.message);
  }
}

module.exports = { sendPasswordResetEmail, isConfigured, logConfigStatus };
