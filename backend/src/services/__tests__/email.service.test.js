const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

// Mocked directly (never via process.env/dotenv) so this test's outcome
// never depends on whether the machine running it happens to have real
// Gmail credentials in its own backend/.env.
const mockEnv = { gmailUser: undefined, gmailAppPassword: undefined };
jest.mock('../../config/env', () => mockEnv);

const emailService = require('../email.service');

const SECRET_TOKEN = 'a'.repeat(64);
const RESET_URL = `http://localhost:5173/reset-password?token=${SECRET_TOKEN}`;

function spyOnConsole() {
  return {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  };
}

function allLoggedText(spies) {
  return [...spies.log.mock.calls, ...spies.warn.mock.calls, ...spies.error.mock.calls]
    .flat()
    .map(String)
    .join('\n');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockReset();
  mockEnv.gmailUser = undefined;
  mockEnv.gmailAppPassword = undefined;
});

describe('sendPasswordResetEmail', () => {
  it('never sends and never throws when Gmail credentials are not configured', async () => {
    const spies = spyOnConsole();

    await expect(
      emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL }),
    ).resolves.toBeUndefined();

    expect(mockSendMail).not.toHaveBeenCalled();
    Object.values(spies).forEach((s) => s.mockRestore());
  });

  it('sends a real email containing the Reset Password CTA and the reset link when credentials are configured', async () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'app-password';
    mockSendMail.mockResolvedValue({});

    await emailService.sendPasswordResetEmail({
      to: 'user@example.com',
      name: 'Layla Haddad',
      resetUrl: RESET_URL,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'sender@gmail.com',
        to: 'user@example.com',
        subject: expect.stringContaining('Reset your'),
        text: expect.stringContaining(RESET_URL),
        html: expect.stringContaining(RESET_URL),
      }),
    );
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toMatch(/Reset your password/i);
    expect(call.text).toMatch(/expire in 1 hour/i);
    expect(call.text).not.toContain('<'); // real plain-text fallback, not HTML reused as-is
  });

  it('never includes the App Password anywhere in the outgoing message', async () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'super-secret-app-password';
    mockSendMail.mockResolvedValue({});

    await emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL });

    const sent = JSON.stringify(mockSendMail.mock.calls[0][0]);
    expect(sent).not.toContain('super-secret-app-password');
  });

  it('swallows a delivery failure — the caller must not fail just because the email bounced', async () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'app-password';
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    const spies = spyOnConsole();

    await expect(
      emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL }),
    ).resolves.toBeUndefined();

    expect(spies.error).toHaveBeenCalled();
    Object.values(spies).forEach((s) => s.mockRestore());
  });

  it('never logs the raw reset token or the full reset URL, on any path — unconfigured, success, or failure', async () => {
    // Unconfigured.
    let spies = spyOnConsole();
    await emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL });
    expect(allLoggedText(spies)).not.toContain(SECRET_TOKEN);
    expect(allLoggedText(spies)).not.toContain(RESET_URL);
    Object.values(spies).forEach((s) => s.mockRestore());

    // Success.
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'app-password';
    mockSendMail.mockResolvedValue({});
    spies = spyOnConsole();
    await emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL });
    expect(allLoggedText(spies)).not.toContain(SECRET_TOKEN);
    expect(allLoggedText(spies)).not.toContain(RESET_URL);
    Object.values(spies).forEach((s) => s.mockRestore());

    // A failed send.
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    spies = spyOnConsole();
    await emailService.sendPasswordResetEmail({ to: 'user@example.com', resetUrl: RESET_URL });
    expect(allLoggedText(spies)).not.toContain(SECRET_TOKEN);
    expect(allLoggedText(spies)).not.toContain(RESET_URL);
    Object.values(spies).forEach((s) => s.mockRestore());
  });
});

describe('logConfigStatus', () => {
  it('logs a safe "not configured" notice, with no credential values, when unset', () => {
    const spies = spyOnConsole();

    emailService.logConfigStatus();

    expect(spies.warn).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    Object.values(spies).forEach((s) => s.mockRestore());
  });

  it('logs a safe "configured" notice, with no credential values, when set', () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'super-secret-app-password';
    const spies = spyOnConsole();

    emailService.logConfigStatus();

    expect(spies.log).toHaveBeenCalledWith(expect.stringContaining('configured'));
    expect(allLoggedText(spies)).not.toContain('super-secret-app-password');
    expect(allLoggedText(spies)).not.toContain('sender@gmail.com');
    Object.values(spies).forEach((s) => s.mockRestore());
  });
});
