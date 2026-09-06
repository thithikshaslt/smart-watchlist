import { PrismaService } from '../prisma/prisma.service';
import { WatchlistsService } from '../watchlists/watchlists.service';
import { WatchlistVisitsService } from './watchlist-visits.service';

describe('WatchlistVisitsService', () => {
  let service: WatchlistVisitsService;
  let prisma: {
    watchlist: { update: jest.Mock };
    instrument: { findFirst: jest.Mock };
    latestQuote: { findUnique: jest.Mock };
    ohlcvCandle: { findMany: jest.Mock };
  };
  let watchlistsService: jest.Mocked<Pick<WatchlistsService, 'getOwned'>>;

  const userId = 'user-1';
  const watchlistId = 'watchlist-1';
  const benchmarkId = 'spy-id';

  // 20 identical flat daily bars (ATR% = 2, see significance.spec.ts) ending
  // well before "now" so tests can freely pick a `now` after them.
  const flatDailyRows = (endingAt: Date) =>
    Array.from({ length: 20 }, (_, i) => ({
      high: 101,
      low: 99,
      close: 100,
      timestamp: new Date(endingAt.getTime() - (19 - i) * 24 * 60 * 60 * 1000),
    }));

  beforeEach(() => {
    prisma = {
      watchlist: { update: jest.fn() },
      instrument: { findFirst: jest.fn() },
      latestQuote: { findUnique: jest.fn() },
      ohlcvCandle: { findMany: jest.fn() },
    };
    watchlistsService = { getOwned: jest.fn() };
    service = new WatchlistVisitsService(
      prisma as unknown as PrismaService,
      watchlistsService as unknown as WatchlistsService,
    );
  });

  it('on a first-ever visit, returns no classification and sets the watermark', async () => {
    watchlistsService.getOwned.mockResolvedValue({
      id: watchlistId,
      lastViewedAt: null,
      items: [{ instrumentId: 'inst-1' }, { instrumentId: 'inst-2' }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await service.recordVisit(userId, watchlistId);

    expect(result.previousViewedAt).toBeNull();
    expect(result.items).toEqual([
      { instrumentId: 'inst-1', classification: null },
      { instrumentId: 'inst-2', classification: null },
    ]);
    expect(result.summary).toEqual({ notableCount: 0, broadMarketCount: 0 });
    expect(prisma.watchlist.update).toHaveBeenCalledWith({
      where: { id: watchlistId },
      data: { lastViewedAt: expect.any(Date) },
    });
  });

  describe('on a subsequent visit', () => {
    const previousViewedAt = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-02T00:00:00Z'); // 1 day later - matches significance.spec.ts's math

    beforeEach(() => {
      watchlistsService.getOwned.mockResolvedValue({
        id: watchlistId,
        lastViewedAt: previousViewedAt,
        items: [{ instrumentId: 'inst-1' }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      jest.useFakeTimers().setSystemTime(now);
      prisma.instrument.findFirst.mockResolvedValue({ id: benchmarkId });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('classifies a notable move and advances the watermark past the minimum gap', async () => {
      prisma.latestQuote.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(
          where.instrumentId === 'inst-1'
            ? { price: 105 } // +5% vs. its value at the previous watermark
            : { price: 100 }, // benchmark flat
        ),
      );
      prisma.ohlcvCandle.findMany.mockResolvedValue(
        flatDailyRows(previousViewedAt),
      );

      const result = await service.recordVisit(userId, watchlistId);

      expect(result.previousViewedAt).toEqual(previousViewedAt);
      expect(result.items).toEqual([
        { instrumentId: 'inst-1', classification: 'notable' },
      ]);
      expect(result.summary).toEqual({ notableCount: 1, broadMarketCount: 0 });
      expect(prisma.watchlist.update).toHaveBeenCalledWith({
        where: { id: watchlistId },
        data: { lastViewedAt: now },
      });
    });

    it('classifies a broad-market move when the benchmark moved comparably', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue({ price: 105 }); // both +5%
      prisma.ohlcvCandle.findMany.mockResolvedValue(
        flatDailyRows(previousViewedAt),
      );

      const result = await service.recordVisit(userId, watchlistId);

      expect(result.items).toEqual([
        { instrumentId: 'inst-1', classification: 'broad-market' },
      ]);
    });

    it('classifies insufficient-history when the instrument lacks 20 daily bars', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue({ price: 105 });
      prisma.ohlcvCandle.findMany.mockResolvedValue(
        flatDailyRows(previousViewedAt).slice(0, 5),
      );

      const result = await service.recordVisit(userId, watchlistId);

      expect(result.items).toEqual([
        { instrumentId: 'inst-1', classification: 'insufficient-history' },
      ]);
    });

    it('does not advance the watermark on a near-immediate repeat visit, but still classifies against the unchanged watermark', async () => {
      jest.useFakeTimers().setSystemTime(
        new Date(previousViewedAt.getTime() + 5 * 60 * 1000), // 5 min later
      );
      prisma.latestQuote.findUnique.mockResolvedValue({ price: 105 });
      prisma.ohlcvCandle.findMany.mockResolvedValue(
        flatDailyRows(previousViewedAt),
      );

      const result = await service.recordVisit(userId, watchlistId);

      expect(result.previousViewedAt).toEqual(previousViewedAt);
      expect(prisma.watchlist.update).not.toHaveBeenCalled();
    });
  });
});
