jest.mock('../../config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
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

const prisma = require('../../config/prisma');
const { comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');
const notificationService = require('../notification.service');
const authService = require('../auth.service');

beforeEach(() => {
  jest.clearAllMocks();
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
