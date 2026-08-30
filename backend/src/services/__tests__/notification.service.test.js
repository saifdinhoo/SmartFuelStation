jest.mock('../../config/prisma', () => ({
  notification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../sockets', () => ({
  getIO: jest.fn(),
  roomForUser: (id) => `user:${id}`,
}));

const prisma = require('../../config/prisma');
const { getIO } = require('../../sockets');
const notificationService = require('../notification.service');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createNotification', () => {
  it("persists first, then emits only to the recipient's own room", async () => {
    const created = { id: 1, userId: 42, type: 'BOOKING_CREATED', title: 't', message: 'm' };
    prisma.notification.create.mockResolvedValue(created);
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    getIO.mockReturnValue({ to });

    const result = await notificationService.createNotification({
      userId: 42,
      type: 'BOOKING_CREATED',
      title: 't',
      message: 'm',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 42 }) }),
    );
    expect(to).toHaveBeenCalledWith('user:42');
    expect(emit).toHaveBeenCalledWith('notification:new', created);
    expect(result).toBe(created);
  });

  it('never emits to a room derived from anything other than the persisted userId', async () => {
    prisma.notification.create.mockResolvedValue({ id: 1, userId: 5 });
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    getIO.mockReturnValue({ to });

    await notificationService.createNotification({
      userId: 5,
      type: 'NEW_REVIEW',
      title: 't',
      message: 'm',
    });

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('user:5');
  });

  it('does not throw when no socket server is running yet (e.g. under Jest)', async () => {
    prisma.notification.create.mockResolvedValue({ id: 1, userId: 5 });
    getIO.mockReturnValue(null);

    await expect(
      notificationService.createNotification({ userId: 5, type: 'NEW_REVIEW', title: 't', message: 'm' }),
    ).resolves.toBeDefined();
  });
});

describe('createNotifications', () => {
  it('creates one notification per recipient', async () => {
    prisma.notification.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: data.userId, ...data }),
    );
    getIO.mockReturnValue(null);

    const result = await notificationService.createNotifications([
      { userId: 1, type: 'PROVIDER_REGISTERED', title: 't', message: 'm' },
      { userId: 2, type: 'PROVIDER_REGISTERED', title: 't', message: 'm' },
    ]);

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });
});

describe('notifyAlmostTurnIfNeeded', () => {
  function snapshot(entries) {
    return { providerId: 2, entries, summary: {} };
  }

  it('notifies the customer at the front of the WAITING line', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 1 });
    getIO.mockReturnValue(null);

    await notificationService.notifyAlmostTurnIfNeeded(
      snapshot([
        { id: 10, status: 'WAITING', customersAhead: 0, customerId: 33, provider: { businessName: 'Al-Nour' } },
        { id: 11, status: 'WAITING', customersAhead: 1, customerId: 44 },
      ]),
    );

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 33,
          type: 'QUEUE_ALMOST_TURN',
          relatedQueueEntryId: 10,
        }),
      }),
    );
  });

  it('never notifies a walk-in entry with no linked customer account', async () => {
    await notificationService.notifyAlmostTurnIfNeeded(
      snapshot([{ id: 10, status: 'WAITING', customersAhead: 0, customerId: null }]),
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('never notifies an IN_SERVICE entry (only WAITING entries wait their turn)', async () => {
    await notificationService.notifyAlmostTurnIfNeeded(
      snapshot([{ id: 10, status: 'IN_SERVICE', customersAhead: null, customerId: 33 }]),
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('does not duplicate the notification on a later broadcast for the same entry', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 999 }); // already notified
    getIO.mockReturnValue(null);

    await notificationService.notifyAlmostTurnIfNeeded(
      snapshot([{ id: 10, status: 'WAITING', customersAhead: 0, customerId: 33 }]),
    );

    expect(prisma.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'QUEUE_ALMOST_TURN', relatedQueueEntryId: 10 },
      }),
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe('listNotifications', () => {
  it('scopes to the given user, newest first, with no unread filter by default', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await notificationService.listNotifications(7);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('applies the unread-only filter when requested', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await notificationService.listNotifications(7, { unreadOnly: true });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 7, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getUnreadCount', () => {
  it("counts only the given user's unread notifications", async () => {
    prisma.notification.count.mockResolvedValue(3);
    const count = await notificationService.getUnreadCount(7);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 7, isRead: false } });
    expect(count).toBe(3);
  });
});

describe('markAsRead (IDOR prevention)', () => {
  it('404s when the notification does not exist', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(notificationService.markAsRead(1, 7)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks a user from marking someone else's notification as read", async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 999 });
    await expect(notificationService.markAsRead(1, 7)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('lets the owner mark their own notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 7 });
    prisma.notification.update.mockResolvedValue({ id: 1, userId: 7, isRead: true });
    await notificationService.markAsRead(1, 7);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isRead: true },
    });
  });
});

describe('markAllAsRead', () => {
  it("only touches the given user's unread notifications", async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await notificationService.markAllAsRead(7);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, isRead: false },
      data: { isRead: true },
    });
  });
});

describe('deleteNotification (IDOR prevention)', () => {
  it('404s when the notification does not exist', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(notificationService.deleteNotification(1, 7)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("blocks a user from deleting someone else's notification", async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 999 });
    await expect(notificationService.deleteNotification(1, 7)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prisma.notification.delete).not.toHaveBeenCalled();
  });

  it('lets the owner delete their own notification', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 7 });
    prisma.notification.delete.mockResolvedValue({});
    await notificationService.deleteNotification(1, 7);
    expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
