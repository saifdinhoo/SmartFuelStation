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
const notificationService = require('../notification.service');
const authService = require('../auth.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('register', () => {
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
