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

// Never throws — a caller must not fail the whole request just because
// email delivery failed; the token itself is already persisted either way.
// When Gmail credentials aren't configured, this is honest about it in the
// server log rather than pretending an email went out.
async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!isConfigured()) {
    console.warn(
      `[email] GMAIL_USER/GMAIL_APP_PASSWORD not set — password reset email NOT sent to ${to}. Reset link: ${resetUrl}`,
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.gmailUser,
      to,
      subject: 'Reset your Smart Automotive Service Platform password',
      text: `We received a request to reset your password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
      html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    });
  } catch (err) {
    console.error('[email] Failed to send password reset email:', err.message);
  }
}

module.exports = { sendPasswordResetEmail, isConfigured };
