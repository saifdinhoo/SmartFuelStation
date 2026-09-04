jest.mock('../../config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));
jest.mock('../../utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed'),
  comparePassword: jest.fn(),
}));
jest.mock('../../utils/jwt', () => ({
  signToken: jest.fn().mockReturnValue('token'),
}));
jest.mock('../notification.service', () => ({
  createNotifications: jest.fn(),
}));
jest.mock('../email.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require('../../config/prisma');
const { comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');
const notificationService = require('../notification.service');
const emailService = require('../email.service');
const authService = require('../auth.service');

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
});

function dbUser(overrides = {}) {
  return {
    id: 1,
    name: 'Test User',
    email: 'user@example.com',
    password: 'hashed-value-never-real',
    role: 'CUSTOMER',
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: null,
    ...overrides,
  };
}

describe('register', () => {
  it('never allows ADMIN to be self-selected through public registration', async () => {
    // Confirms the code-level protection: ADMIN accounts in this database
    // (e.g. the ones an admin manually promotes for their own team) can
    // only exist via a direct database change, never through this endpoint.
    await expect(
      authService.register({ name: 'X', email: 'x@example.com', password: 'pw', role: 'ADMIN' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not notify anyone when a customer registers', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Sam',
      email: 's@example.com',
      role: 'CUSTOMER',
      password: 'hashed',
      provider: null,
    });

    await authService.register({ name: 'Sam', email: 's@example.com', password: 'pw' });

    expect(notificationService.createNotifications).not.toHaveBeenCalled();
  });

  it('notifies every admin when a provider registers', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.user.create.mockResolvedValue({
      id: 10,
      name: 'Shop Owner',
      email: 'owner@example.com',
      role: 'PROVIDER',
      password: 'hashed',
      provider: { id: 5, businessName: 'Al-Nour Auto' },
    });

    await authService.register({
      name: 'Shop Owner',
      email: 'owner@example.com',
      password: 'pw',
      role: 'PROVIDER',
      businessName: 'Al-Nour Auto',
      address: '123 Main St',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    expect(notificationService.createNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 1, type: 'PROVIDER_REGISTERED', relatedProviderId: 5 }),
      expect.objectContaining({ userId: 2, type: 'PROVIDER_REGISTERED', relatedProviderId: 5 }),
    ]);
  });

  it('sends no admin notifications when there are no admins yet', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.create.mockResolvedValue({
      id: 10,
      role: 'PROVIDER',
      password: 'hashed',
      provider: { id: 5, businessName: 'Al-Nour Auto' },
    });

    await authService.register({
      name: 'Shop Owner',
      email: 'owner@example.com',
      password: 'pw',
      role: 'PROVIDER',
      businessName: 'Al-Nour Auto',
      address: '123 Main St',
    });

    expect(notificationService.createNotifications).toHaveBeenCalledWith([]);
  });
});

describe('login (Phase E)', () => {
  it.each(['CUSTOMER', 'PROVIDER', 'ADMIN'])(
    'returns a JWT and the correct role for a valid %s login',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ role }));
      comparePassword.mockResolvedValue(true);

      const result = await authService.login({ email: 'user@example.com', password: 'demo123' });

      expect(result.user.role).toBe(role);
      expect(result.token).toBe('token');
      expect(signToken).toHaveBeenCalledWith(expect.objectContaining({ role }));
    },
  );

  it('JWT is only generated after bcrypt.compare succeeds — never before', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser());
    comparePassword.mockResolvedValue(true);

    await authService.login({ email: 'user@example.com', password: 'demo123' });

    expect(comparePassword).toHaveBeenCalledWith('demo123', 'hashed-value-never-real');
    expect(signToken).toHaveBeenCalled();
  });

  it('never signs a token when bcrypt.compare rejects the password', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser());
    comparePassword.mockResolvedValue(false);

    await expect(
      authService.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(signToken).not.toHaveBeenCalled();
  });

  it('rejects an unknown email with the exact same message and status as a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const unknownEmailError = await authService
      .login({ email: 'nobody@example.com', password: 'demo123' })
      .catch((e) => e);

    prisma.user.findUnique.mockResolvedValue(dbUser());
    comparePassword.mockResolvedValue(false);
    const wrongPasswordError = await authService
      .login({ email: 'user@example.com', password: 'wrong' })
      .catch((e) => e);

    // Same status and message either way — a client can never tell "no such
    // account" apart from "wrong password" (no user-enumeration leak).
    expect(unknownEmailError.statusCode).toBe(401);
    expect(wrongPasswordError.statusCode).toBe(401);
    expect(unknownEmailError.message).toBe(wrongPasswordError.message);
  });

  it('rejects a missing email or password with 400, before ever touching the database', async () => {
    await expect(authService.login({ password: 'demo123' })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(authService.login({ email: 'user@example.com' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('never returns the password hash in the response, on any login', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser());
    comparePassword.mockResolvedValue(true);

    const result = await authService.login({ email: 'user@example.com', password: 'demo123' });

    expect(result.user).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('hashed-value-never-real');
  });

  it("a provider's login result carries their own provider ownership, never another's", async () => {
    prisma.user.findUnique.mockResolvedValue(
      dbUser({ role: 'PROVIDER', provider: { id: 7, businessName: 'Cedars Auto Care', userId: 1 } }),
    );
    comparePassword.mockResolvedValue(true);

    const result = await authService.login({ email: 'provider@example.com', password: 'demo123' });

    expect(result.user.provider).toMatchObject({ id: 7, businessName: 'Cedars Auto Care' });
  });

  it('an unapproved provider can still authenticate — approval gates visibility, not login', async () => {
    // Matches the existing, intentional separation of concerns: nothing in
    // login() reads provider.isApproved. This is a documented behavior
    // check, not a bug — see the Phase E report's "provider approval"
    // section for why this is left alone.
    prisma.user.findUnique.mockResolvedValue(
      dbUser({ role: 'PROVIDER', provider: { id: 8, isApproved: false, userId: 1 } }),
    );
    comparePassword.mockResolvedValue(true);

    await expect(
      authService.login({ email: 'unapproved@example.com', password: 'demo123' }),
    ).resolves.toMatchObject({ user: { role: 'PROVIDER' } });
  });
});

describe('email normalization (Phase E)', () => {
  it('login matches an existing account regardless of the case submitted', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ email: 'layla@smartauto.local' }));
    comparePassword.mockResolvedValue(true);

    await authService.login({ email: 'Layla@SmartAuto.Local', password: 'demo123' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'layla@smartauto.local' } }),
    );
  });

  it('login trims leading/trailing whitespace from the submitted email', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ email: 'layla@smartauto.local' }));
    comparePassword.mockResolvedValue(true);

    await authService.login({ email: '  layla@smartauto.local  ', password: 'demo123' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'layla@smartauto.local' } }),
    );
  });

  it('registration stores the email lowercased, regardless of how it was typed', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(dbUser({ email: 'newuser@example.com' }));

    await authService.register({ name: 'New User', email: 'NewUser@Example.com', password: 'pw' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'newuser@example.com' } });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'newuser@example.com' }) }),
    );
  });

  it('registration rejects a duplicate that only differs by case', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ email: 'layla@smartauto.local' }));

    await expect(
      authService.register({ name: 'Someone Else', email: 'LAYLA@SMARTAUTO.LOCAL', password: 'pw' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('changePassword', () => {
  it('valid change: verifies the current password, hashes the new one, and updates only that user', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ id: 42 }));
    comparePassword.mockResolvedValue(true);
    const { hashPassword } = require('../../utils/password');
    hashPassword.mockResolvedValue('new-hashed-value');

    const result = await authService.changePassword({
      userId: 42,
      currentPassword: 'old-real-password',
      newPassword: 'new-real-password',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(comparePassword).toHaveBeenCalledWith('old-real-password', 'hashed-value-never-real');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { password: 'new-hashed-value' },
    });
    expect(result).not.toHaveProperty('password');
  });

  it('replaces the stored password outright — the old hash is never kept alongside the new one', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ id: 7, password: 'old-hashed-value' }));
    comparePassword.mockResolvedValue(true);
    const { hashPassword } = require('../../utils/password');
    hashPassword.mockResolvedValue('brand-new-hashed-value');

    await authService.changePassword({
      userId: 7,
      currentPassword: 'old-real-password',
      newPassword: 'brand-new-real-password',
    });

    const updateCall = prisma.user.update.mock.calls[0][0];
    expect(updateCall.data.password).toBe('brand-new-hashed-value');
    expect(updateCall.data.password).not.toBe('old-hashed-value');
    expect(Object.keys(updateCall.data)).toEqual(['password']);
  });

  it('rejects an incorrect current password with a 400 (not 401) so the client is never logged out for a typo', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ id: 42 }));
    comparePassword.mockResolvedValue(false);

    await expect(
      authService.changePassword({ userId: 42, currentPassword: 'wrong', newPassword: 'new-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than the project minimum, before ever touching the database', async () => {
    await expect(
      authService.changePassword({ userId: 42, currentPassword: 'old-real-password', newPassword: 'ab1' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a missing currentPassword or newPassword', async () => {
    await expect(
      authService.changePassword({ userId: 42, currentPassword: '', newPassword: 'new-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      authService.changePassword({ userId: 42, currentPassword: 'old-real-password', newPassword: '' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('cannot target another user — the update is always scoped to the exact userId passed in, never the request body', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser({ id: 99 }));
    comparePassword.mockResolvedValue(true);

    await authService.changePassword({
      userId: 99,
      currentPassword: 'old-real-password',
      newPassword: 'new-real-password',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99 } }),
    );
  });

  it('returns a safe 404 rather than crashing if the authenticated user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.changePassword({ userId: 999, currentPassword: 'x', newPassword: 'new-password' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(comparePassword).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('returns the real row, scoped to the given id, with the password stripped', async () => {
    prisma.user.findUnique.mockResolvedValue(
      dbUser({ id: 42, name: 'Layla Hassan', phone: '+961 70 555 101' }),
    );

    const result = await authService.getCurrentUser(42);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 42 },
      include: { provider: true },
    });
    expect(result).not.toHaveProperty('password');
    expect(result.name).toBe('Layla Hassan');
    expect(result.phone).toBe('+961 70 555 101');
  });
});

describe('updateCurrentUser', () => {
  it('valid update: trims and saves name and phone, scoped to the given userId, password stripped from the result', async () => {
    prisma.user.update.mockResolvedValue(
      dbUser({ id: 42, name: 'Layla H.', phone: '+961 70 999 000' }),
    );

    const result = await authService.updateCurrentUser(42, {
      name: '  Layla H.  ',
      phone: '  +961 70 999 000  ',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { name: 'Layla H.', phone: '+961 70 999 000' },
      include: { provider: true },
    });
    expect(result).not.toHaveProperty('password');
  });

  it('supports a partial update — only the fields actually sent are written', async () => {
    prisma.user.update.mockResolvedValue(dbUser({ id: 42, name: 'New Name' }));

    await authService.updateCurrentUser(42, { name: 'New Name' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { name: 'New Name' },
      include: { provider: true },
    });
  });

  it('clears the phone number when explicitly sent as an empty string or null', async () => {
    prisma.user.update.mockResolvedValue(dbUser({ id: 42, phone: null }));

    await authService.updateCurrentUser(42, { phone: '   ' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } }),
    );

    prisma.user.update.mockClear();
    await authService.updateCurrentUser(42, { phone: null });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } }),
    );
  });

  it('rejects an empty/whitespace-only name, before ever touching the database', async () => {
    await expect(authService.updateCurrentUser(42, { name: '   ' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a call with neither name nor phone — nothing to update', async () => {
    await expect(authService.updateCurrentUser(42, {})).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('is always scoped to the exact userId passed in — there is no id field in `input` for a client to target another account with', async () => {
    prisma.user.update.mockResolvedValue(dbUser({ id: 99 }));

    await authService.updateCurrentUser(99, { name: 'Someone' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99 } }),
    );
  });

  it.each(['email', 'role', 'password', 'passwordHash', 'id'])(
    'never writes a %s field even if the caller passes one through — only name/phone are ever read off input',
    async (field) => {
      prisma.user.update.mockResolvedValue(dbUser({ id: 42 }));

      await authService.updateCurrentUser(42, {
        name: 'Legit Name',
        [field]: 'attempted-injection',
      });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty(field);
      expect(Object.keys(updateCall.data)).toEqual(['name']);
    },
  );
});

describe('requestPasswordReset', () => {
  it('creates no token and sends no email for an unknown address — never reveals whether it exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(authService.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();

    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('creates a hashed (never raw) token and emails a link built from it, for a real account', async () => {
    prisma.user.findUnique.mockResolvedValue(
      dbUser({ id: 42, email: 'user@example.com', name: 'Layla Haddad' }),
    );

    await authService.requestPasswordReset('user@example.com');

    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
    expect(createCall.data.userId).toBe(42);
    expect(createCall.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createCall.data.expiresAt).toBeInstanceOf(Date);

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const emailCall = emailService.sendPasswordResetEmail.mock.calls[0][0];
    expect(emailCall.to).toBe('user@example.com');
    expect(emailCall.name).toBe('Layla Haddad');
    expect(emailCall.resetUrl).toContain('/reset-password?token=');
    // The raw token in the URL is never the same string as what got stored.
    const rawToken = emailCall.resetUrl.split('token=')[1];
    expect(rawToken).not.toBe(createCall.data.tokenHash);
  });

  it('is a silent no-op for an empty/missing email, never touching the database', async () => {
    await expect(authService.requestPasswordReset('')).resolves.toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  function tokenRow(overrides = {}) {
    return {
      id: 1,
      userId: 42,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      ...overrides,
    };
  }

  it('rejects a token that does not exist', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(
      authService.resetPassword({ token: 'nope', newPassword: 'new-real-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(
      tokenRow({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      authService.resetPassword({ token: 'expired-token', newPassword: 'new-real-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an already-used token — single use only', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(tokenRow({ usedAt: new Date() }));

    await expect(
      authService.resetPassword({ token: 'reused-token', newPassword: 'new-real-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('gives the exact same error and status for "no such token", "expired", and "already used" — no oracle', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    const noSuchToken = await authService
      .resetPassword({ token: 'a', newPassword: 'new-real-password' })
      .catch((e) => e);

    prisma.passwordResetToken.findUnique.mockResolvedValue(
      tokenRow({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const expired = await authService
      .resetPassword({ token: 'b', newPassword: 'new-real-password' })
      .catch((e) => e);

    prisma.passwordResetToken.findUnique.mockResolvedValue(tokenRow({ usedAt: new Date() }));
    const alreadyUsed = await authService
      .resetPassword({ token: 'c', newPassword: 'new-real-password' })
      .catch((e) => e);

    expect(noSuchToken.statusCode).toBe(400);
    expect(expired.statusCode).toBe(400);
    expect(alreadyUsed.statusCode).toBe(400);
    expect(noSuchToken.message).toBe(expired.message);
    expect(expired.message).toBe(alreadyUsed.message);
  });

  it('rejects a new password shorter than the project minimum, before ever touching the database', async () => {
    await expect(
      authService.resetPassword({ token: 'x', newPassword: 'ab1' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a missing token or newPassword', async () => {
    await expect(
      authService.resetPassword({ token: '', newPassword: 'new-real-password' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      authService.resetPassword({ token: 'x', newPassword: '' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it('valid reset: hashes the new password, marks the token used, and invalidates the user\'s other outstanding tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(tokenRow({ id: 5, userId: 42 }));
    const { hashPassword } = require('../../utils/password');
    hashPassword.mockResolvedValue('new-hashed-value');

    const result = await authService.resetPassword({
      token: 'valid-real-token',
      newPassword: 'brand-new-real-password',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { password: 'new-hashed-value' },
    });
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 42, id: { not: 5 }, usedAt: null },
    });
    expect(result).toMatchObject({ message: expect.any(String) });
  });

  it('looks the token up by its hash, never the raw token — a stolen database row is useless on its own', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);

    await authService
      .resetPassword({ token: 'a-raw-token-value', newPassword: 'new-real-password' })
      .catch(() => {});

    const lookupArg = prisma.passwordResetToken.findUnique.mock.calls[0][0];
    expect(lookupArg.where.tokenHash).not.toBe('a-raw-token-value');
    expect(lookupArg.where.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
