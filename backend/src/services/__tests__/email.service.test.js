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

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockReset();
  mockEnv.gmailUser = undefined;
  mockEnv.gmailAppPassword = undefined;
});

describe('sendPasswordResetEmail', () => {
  it('never sends and never throws when Gmail credentials are not configured — stays honest in the log instead', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'http://localhost:5173/reset-password?token=abc',
      }),
    ).resolves.toBeUndefined();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
    warnSpy.mockRestore();
  });

  it('sends a real email with the reset link when credentials are configured', async () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'app-password';
    mockSendMail.mockResolvedValue({});

    await emailService.sendPasswordResetEmail({
      to: 'user@example.com',
      resetUrl: 'http://localhost:5173/reset-password?token=abc',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'sender@gmail.com',
        to: 'user@example.com',
        text: expect.stringContaining('http://localhost:5173/reset-password?token=abc'),
        html: expect.stringContaining('http://localhost:5173/reset-password?token=abc'),
      }),
    );
  });

  it('swallows a delivery failure — the caller must not fail just because the email bounced', async () => {
    mockEnv.gmailUser = 'sender@gmail.com';
    mockEnv.gmailAppPassword = 'app-password';
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      emailService.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'http://localhost:5173/reset-password?token=abc',
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
