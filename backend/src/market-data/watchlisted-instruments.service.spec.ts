import { PrismaService } from '../prisma/prisma.service';
import { WatchlistedInstrumentsService } from './watchlisted-instruments.service';

describe('WatchlistedInstrumentsService', () => {
  let service: WatchlistedInstrumentsService;
  let prisma: {
    watchlistItem: { findMany: jest.Mock };
    latestQuote: { findMany: jest.Mock };
    instrument: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      watchlistItem: { findMany: jest.fn() },
      latestQuote: { findMany: jest.fn() },
      // No benchmark instrument in the catalog by default, so existing
      // tests that don't care about benchmarks see today's behavior.
      instrument: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new WatchlistedInstrumentsService(
      prisma as unknown as PrismaService,
    );
  });

  describe('getDistinctInstrumentIds', () => {
    it('only returns instruments that appear in at least one watchlist', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        { instrumentId: 'aapl' },
        { instrumentId: 'msft' },
      ]);

      const ids = await service.getDistinctInstrumentIds();

      expect(ids).toEqual(['aapl', 'msft']);
      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ distinct: ['instrumentId'] }),
      );
    });

    it('always includes the benchmark instrument, even with an empty watchlist', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([]);
      prisma.instrument.findMany.mockResolvedValue([{ id: 'spy' }]);

      const ids = await service.getDistinctInstrumentIds();

      expect(ids).toEqual(['spy']);
      expect(prisma.instrument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { symbol: { in: ['SPY'] } },
        }),
      );
    });

    it('does not duplicate a benchmark that is also watchlisted', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        { instrumentId: 'spy' },
      ]);
      prisma.instrument.findMany.mockResolvedValue([{ id: 'spy' }]);

      const ids = await service.getDistinctInstrumentIds();

      expect(ids).toEqual(['spy']);
    });
  });

  describe('getIdsDueForQuoteRefresh', () => {
    const now = new Date('2026-01-01T12:00:00Z');

    it('excludes an instrument whose quote is still within the current freshness window', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        { instrumentId: 'just-ingested' },
      ]);
      prisma.latestQuote.findMany.mockResolvedValue([
        {
          instrumentId: 'just-ingested',
          // 1 minute old - well inside the 10-minute current threshold.
          ingestedAt: new Date(now.getTime() - 60 * 1000),
        },
      ]);

      const ids = await service.getIdsDueForQuoteRefresh(now);

      expect(ids).toEqual([]);
    });

    it('orders never-ingested instruments before ones with an older quote, and older before newer, excluding still-fresh ones', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([
        { instrumentId: 'fresh' },
        { instrumentId: 'never-ingested' },
        { instrumentId: 'old' },
      ]);
      prisma.latestQuote.findMany.mockResolvedValue([
        // 1 minute old - still fresh, should be excluded.
        {
          instrumentId: 'fresh',
          ingestedAt: new Date(now.getTime() - 60 * 1000),
        },
        // 1 hour old - past the current threshold, due for refresh.
        {
          instrumentId: 'old',
          ingestedAt: new Date(now.getTime() - 60 * 60 * 1000),
        },
      ]);

      const ids = await service.getIdsDueForQuoteRefresh(now);

      expect(ids).toEqual(['never-ingested', 'old']);
    });

    it('returns an empty array when nothing is watchlisted', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([]);

      const ids = await service.getIdsDueForQuoteRefresh(now);

      expect(ids).toEqual([]);
      expect(prisma.latestQuote.findMany).not.toHaveBeenCalled();
    });

    it('still considers the benchmark instrument due for refresh with an empty watchlist', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([]);
      prisma.instrument.findMany.mockResolvedValue([{ id: 'spy' }]);
      prisma.latestQuote.findMany.mockResolvedValue([]);

      const ids = await service.getIdsDueForQuoteRefresh(now);

      expect(ids).toEqual(['spy']);
    });
  });
});
