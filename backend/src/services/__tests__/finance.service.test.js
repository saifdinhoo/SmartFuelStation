jest.mock('../../config/prisma', () => ({
  financialTransaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  provider: { findUnique: jest.fn(), update: jest.fn() },
}));
jest.mock('../providerHours.service', () => ({ requireOwnProvider: jest.fn() }));

const prisma = require('../../config/prisma');
const { requireOwnProvider } = require('../providerHours.service');
const financeService = require('../finance.service');

const ZERO_SUM = { _sum: { grossAmount: null, commissionAmount: null, providerNetAmount: null } };
const ZERO_NET = { _sum: { providerNetAmount: null } };

beforeEach(() => {
  jest.resetAllMocks();
  prisma.financialTransaction.aggregate.mockResolvedValue(ZERO_SUM);
  prisma.financialTransaction.findMany.mockResolvedValue([]);
  prisma.financialTransaction.count.mockResolvedValue(0);
});

describe('computeSplit', () => {
  it('computes a standard 10% split', () => {
    const { commissionAmount, providerNetAmount } = financeService.computeSplit(100, 10);
    expect(commissionAmount.toString()).toBe('10');
    expect(providerNetAmount.toString()).toBe('90');
  });

  it('rounds to 2 decimal places, half-up', () => {
    // 33.33 * 12.5% = 4.16625 -> rounds to 4.17
    const { commissionAmount, providerNetAmount } = financeService.computeSplit(33.33, 12.5);
    expect(commissionAmount.toString()).toBe('4.17');
    expect(providerNetAmount.toString()).toBe('29.16');
  });

  it('commission and net always sum exactly back to gross — no penny drift', () => {
    const gross = 19.99;
    const rate = 7.5;
    const { commissionAmount, providerNetAmount } = financeService.computeSplit(gross, rate);
    expect(commissionAmount.plus(providerNetAmount).toString()).toBe('19.99');
  });

  it('handles 0% commission (all net) and 100% commission (all platform)', () => {
    expect(financeService.computeSplit(100, 0).providerNetAmount.toString()).toBe('100');
    expect(financeService.computeSplit(100, 0).commissionAmount.toString()).toBe('0');
    expect(financeService.computeSplit(100, 100).providerNetAmount.toString()).toBe('0');
    expect(financeService.computeSplit(100, 100).commissionAmount.toString()).toBe('100');
  });
});

describe('createTransactionForCompletedBooking', () => {
  function booking(overrides = {}) {
    return {
      id: 1,
      priceAtBooking: '100.00',
      providerService: { providerId: 2 },
      ...overrides,
    };
  }

  it('creates a new ledger row using the gross price and current commission rate', async () => {
    const tx = {
      financialTransaction: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      provider: { findUnique: jest.fn().mockResolvedValue({ commissionRate: '10.00' }) },
    };
    tx.financialTransaction.create.mockResolvedValue({ id: 9 });

    await financeService.createTransactionForCompletedBooking(booking(), tx);

    expect(tx.financialTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 1,
        providerId: 2,
        grossAmount: '100.00',
        commissionRate: '10.00',
      }),
    });
    const { data } = tx.financialTransaction.create.mock.calls[0][0];
    expect(data.commissionAmount.toString()).toBe('10');
    expect(data.providerNetAmount.toString()).toBe('90');
  });

  it('is idempotent: does not create a second row if one already exists for this booking', async () => {
    const existing = { id: 9, bookingId: 1 };
    const tx = {
      financialTransaction: { findUnique: jest.fn().mockResolvedValue(existing), create: jest.fn() },
      provider: { findUnique: jest.fn() },
    };

    const result = await financeService.createTransactionForCompletedBooking(booking(), tx);

    expect(result).toBe(existing);
    expect(tx.financialTransaction.create).not.toHaveBeenCalled();
    expect(tx.provider.findUnique).not.toHaveBeenCalled();
  });

  it('recovers from a concurrent-completion race (unique constraint) by returning the winner\'s row', async () => {
    const raceError = new Error('Unique constraint failed');
    raceError.code = 'P2002';
    const winnerRow = { id: 9, bookingId: 1 };
    const tx = {
      financialTransaction: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winnerRow),
        create: jest.fn().mockRejectedValue(raceError),
      },
      provider: { findUnique: jest.fn().mockResolvedValue({ commissionRate: '10.00' }) },
    };

    const result = await financeService.createTransactionForCompletedBooking(booking(), tx);

    expect(result).toBe(winnerRow);
  });

  it('does not mask unrelated database errors as a race', async () => {
    const unrelated = new Error('connection lost');
    unrelated.code = 'P1017';
    const tx = {
      financialTransaction: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockRejectedValue(unrelated) },
      provider: { findUnique: jest.fn().mockResolvedValue({ commissionRate: '10.00' }) },
    };

    await expect(financeService.createTransactionForCompletedBooking(booking(), tx)).rejects.toThrow(
      'connection lost',
    );
  });
});

describe('getAdminSummary', () => {
  it('returns real aggregated totals and a per-day trend', async () => {
    prisma.financialTransaction.aggregate
      .mockResolvedValueOnce({
        _sum: { grossAmount: '300.00', commissionAmount: '30.00', providerNetAmount: '270.00' },
      })
      .mockResolvedValueOnce({ _sum: { providerNetAmount: '90.00' } })
      .mockResolvedValueOnce({ _sum: { providerNetAmount: '180.00' } });
    prisma.financialTransaction.count.mockResolvedValue(3);
    prisma.financialTransaction.findMany.mockResolvedValue([]);

    const summary = await financeService.getAdminSummary('7d');

    expect(summary).toMatchObject({
      grossServiceValue: 300,
      platformCommissionRevenue: 30,
      providerNetEarnings: 270,
      pendingSettlementAmount: 90,
      settledAmount: 180,
      transactionCount: 3,
    });
    expect(summary.trend).toHaveLength(7);
  });

  it('reports zero totals rather than null/NaN when there are no transactions yet', async () => {
    const summary = await financeService.getAdminSummary('30d');
    expect(summary.grossServiceValue).toBe(0);
    expect(summary.platformCommissionRevenue).toBe(0);
    expect(summary.providerNetEarnings).toBe(0);
    expect(summary.pendingSettlementAmount).toBe(0);
    expect(summary.settledAmount).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('rejects an unrecognized range', async () => {
    await expect(financeService.getAdminSummary('1y')).rejects.toMatchObject({ statusCode: 400 });
  });

  // Regression test: a live manual test found that a transaction created
  // moments ago (exactly what a freshly completed booking produces)
  // silently vanished from the trend chart on a server whose local
  // timezone is ahead of UTC — the window boundary was computed in local
  // time but bucket keys were sliced from ISO (UTC) strings, so "today"'s
  // local-midnight boundary landed on the wrong UTC calendar day and the
  // most recent bucket never matched. The trend must now be timezone-
  // independent: a row created right now always lands in the last bucket.
  it('a transaction created just now always appears in the trend, regardless of server timezone', async () => {
    prisma.financialTransaction.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date(),
        grossAmount: '100.00',
        commissionAmount: '10.00',
        providerNetAmount: '90.00',
      },
    ]);

    const summary = await financeService.getAdminSummary('7d');

    const lastPoint = summary.trend[summary.trend.length - 1];
    expect(lastPoint.gross).toBe(100);
    expect(lastPoint.commission).toBe(10);
    expect(lastPoint.net).toBe(90);
  });

  it('the trend window is inclusive of today, not just the days strictly before it', async () => {
    prisma.financialTransaction.findMany.mockResolvedValueOnce([]);
    const summary = await financeService.getAdminSummary('7d');
    const todayKey = new Date().toISOString().slice(0, 10);
    expect(summary.trend.map((p) => p.label)).toContain(todayKey);
  });
});

describe('getAdminProviderFinance', () => {
  it('404s for a provider that does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(financeService.getAdminProviderFinance(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns totals, trend and the transaction list for a real provider', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 2, businessName: 'Cedars Auto', commissionRate: '10.00' });
    prisma.financialTransaction.findMany
      .mockResolvedValueOnce([
        {
          id: 1,
          bookingId: 5,
          providerId: 2,
          provider: { businessName: 'Cedars Auto' },
          grossAmount: '100.00',
          commissionRate: '10.00',
          commissionAmount: '10.00',
          providerNetAmount: '90.00',
          settlementStatus: 'PENDING',
          settledAt: null,
          settledByAdminId: null,
          settledByAdmin: null,
          createdAt: new Date('2026-08-30T00:00:00.000Z'),
          updatedAt: new Date('2026-08-30T00:00:00.000Z'),
          booking: { id: 5, status: 'COMPLETED', scheduledAt: new Date(), providerService: { name: 'Oil Change' } },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await financeService.getAdminProviderFinance(2, '7d');

    expect(result.providerId).toBe(2);
    expect(result.providerName).toBe('Cedars Auto');
    expect(result.commissionRate).toBe(10);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      id: 1,
      grossAmount: 100,
      commissionAmount: 10,
      providerNetAmount: 90,
      settlementStatus: 'PENDING',
    });
    // Provider-facing serializer never leaks into the admin shape either way,
    // but the admin shape itself must never be missing an audit field.
    expect(result.transactions[0]).toHaveProperty('settledByAdminId');
  });
});

describe('setSettlementStatus', () => {
  it('404s for a transaction that does not exist', async () => {
    prisma.financialTransaction.findUnique.mockResolvedValue(null);
    await expect(financeService.setSettlementStatus(999, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects settling a transaction that is already SETTLED', async () => {
    prisma.financialTransaction.findUnique.mockResolvedValue({ id: 1, settlementStatus: 'SETTLED' });
    await expect(financeService.setSettlementStatus(1, 1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('moves PENDING -> SETTLED, stamping settledAt and settledByAdminId', async () => {
    prisma.financialTransaction.findUnique.mockResolvedValue({ id: 1, settlementStatus: 'PENDING' });
    prisma.financialTransaction.update.mockResolvedValue({
      id: 1,
      bookingId: 5,
      providerId: 2,
      provider: { businessName: 'Cedars Auto' },
      grossAmount: '100.00',
      commissionRate: '10.00',
      commissionAmount: '10.00',
      providerNetAmount: '90.00',
      settlementStatus: 'SETTLED',
      settledAt: new Date('2026-08-31T00:00:00.000Z'),
      settledByAdminId: 1,
      settledByAdmin: { id: 1, name: 'Admin One' },
      createdAt: new Date(),
      updatedAt: new Date(),
      booking: null,
    });

    const result = await financeService.setSettlementStatus(1, 1);

    expect(prisma.financialTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          settlementStatus: 'SETTLED',
          settledAt: expect.any(Date),
          settledByAdminId: 1,
        }),
      }),
    );
    expect(result.settlementStatus).toBe('SETTLED');
    expect(result.settledByAdminName).toBe('Admin One');
  });
});

describe('commission configuration', () => {
  describe('getProviderCommission / setProviderCommission (admin)', () => {
    it('404s reading commission for a provider that does not exist', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(financeService.getProviderCommission(999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('404s writing commission for a provider that does not exist', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(financeService.setProviderCommission(999, 15, 1)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it.each([-1, 100.01, Number.NaN, 'not-a-number'])('rejects an out-of-range or invalid rate: %p', async (bad) => {
      prisma.provider.findUnique.mockResolvedValue({ id: 2 });
      await expect(financeService.setProviderCommission(2, bad, 1)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.provider.update).not.toHaveBeenCalled();
    });

    it('accepts the boundary values 0 and 100', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 2 });
      prisma.provider.update.mockResolvedValue({
        id: 2,
        commissionRate: '0.00',
        commissionUpdatedAt: new Date(),
        commissionUpdatedByAdminId: 1,
      });
      await expect(financeService.setProviderCommission(2, 0, 1)).resolves.toMatchObject({
        commissionRate: 0,
      });
    });

    it('records the acting admin and timestamp, and future rate is what gets stored', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 2 });
      prisma.provider.update.mockResolvedValue({
        id: 2,
        commissionRate: '15.00',
        commissionUpdatedAt: new Date('2026-08-31T00:00:00.000Z'),
        commissionUpdatedByAdminId: 7,
      });

      const result = await financeService.setProviderCommission(2, 15, 7);

      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({
            commissionRate: 15,
            commissionUpdatedByAdminId: 7,
            commissionUpdatedAt: expect.any(Date),
          }),
        }),
      );
      expect(result).toMatchObject({ providerId: 2, commissionRate: 15, updatedByAdminId: 7 });
    });
  });

  describe('provider-own reads (identity from JWT only)', () => {
    it('getOwnCommission never accepts a providerId — it is resolved from the JWT', async () => {
      requireOwnProvider.mockResolvedValue({
        id: 2,
        commissionRate: '10.00',
        commissionUpdatedAt: null,
        commissionUpdatedByAdminId: null,
      });

      const result = await financeService.getOwnCommission(77);

      expect(requireOwnProvider).toHaveBeenCalledWith(77);
      expect(result).toMatchObject({ providerId: 2, commissionRate: 10 });
    });

    it('getOwnSummary scopes totals to the caller\'s own provider only', async () => {
      requireOwnProvider.mockResolvedValue({ id: 2, commissionRate: '10.00' });

      await financeService.getOwnSummary(77, '30d');

      expect(requireOwnProvider).toHaveBeenCalledWith(77);
      for (const call of prisma.financialTransaction.aggregate.mock.calls) {
        expect(call[0].where).toEqual(expect.objectContaining({ providerId: 2 }));
      }
    });

    it('listOwnTransactions never returns the admin-only settledByAdmin fields', async () => {
      requireOwnProvider.mockResolvedValue({ id: 2 });
      prisma.financialTransaction.findMany.mockResolvedValue([
        {
          id: 1,
          bookingId: 5,
          grossAmount: '100.00',
          commissionRate: '10.00',
          commissionAmount: '10.00',
          providerNetAmount: '90.00',
          settlementStatus: 'SETTLED',
          settledAt: new Date(),
          settledByAdminId: 1,
          settledByAdmin: { id: 1, name: 'Admin One' },
          createdAt: new Date(),
          booking: { id: 5, status: 'COMPLETED', scheduledAt: new Date(), providerService: { name: 'Oil Change' } },
        },
      ]);

      const rows = await financeService.listOwnTransactions(77);

      expect(rows[0]).not.toHaveProperty('settledByAdminId');
      expect(rows[0]).not.toHaveProperty('settledByAdminName');
      expect(rows[0]).toMatchObject({ grossAmount: 100, providerNetAmount: 90 });
    });
  });
});
