import { CandleInterval, Instrument } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataProvider } from '../market-data-provider.interface';
import { TwelveDataRateLimiterService } from '../twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from '../watchlisted-instruments.service';
import { CandleIngestionService } from './candle-ingestion.service';

describe('CandleIngestionService', () => {
  let prisma: {
    instrument: { findUnique: jest.Mock };
    ohlcvCandle: { upsert: jest.Mock; groupBy: jest.Mock };
  };
  let watchlistedInstruments: jest.Mocked<WatchlistedInstrumentsService>;
  let provider: jest.Mocked<MarketDataProvider>;
  let service: CandleIngestionService;

  const instrument: Instrument = {
    id: 'inst-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    providerSymbol: 'AAPL',
    createdAt: new Date(),
  };
  const candle = {
    timestamp: new Date('2026-01-01T00:00:00Z'),
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
  };

  // A Thursday, so intraday tests default to an open market unless a test
  // overrides `now` to fall on a weekend.
  const OPEN_MARKET_NOW = new Date('2026-01-01T12:00:00Z');
  const WEEKEND_NOW = new Date('2026-01-03T12:00:00Z'); // Saturday

  beforeEach(() => {
    prisma = {
      instrument: { findUnique: jest.fn().mockResolvedValue(instrument) },
      ohlcvCandle: { upsert: jest.fn(), groupBy: jest.fn() },
    };
    watchlistedInstruments = {
      getDistinctInstrumentIds: jest.fn().mockResolvedValue(['inst-1']),
      getIdsDueForQuoteRefresh: jest.fn(),
    } as unknown as jest.Mocked<WatchlistedInstrumentsService>;
    provider = {
      getQuote: jest.fn(),
      getCandles: jest.fn().mockResolvedValue([candle]),
    };

    service = new CandleIngestionService(
      prisma as unknown as PrismaService,
      watchlistedInstruments,
      new TwelveDataRateLimiterService(),
      provider,
    );
  });

  describe('ingestDaily', () => {
    it('ingests a benchmark instrument returned by getDistinctInstrumentIds even with an otherwise empty watchlist', async () => {
      // getDistinctInstrumentIds owns the watchlist-vs-benchmark union; this
      // just confirms candle ingestion still iterates whatever it returns.
      watchlistedInstruments.getDistinctInstrumentIds.mockResolvedValue([
        'benchmark-1',
      ]);
      prisma.instrument.findUnique.mockResolvedValue({
        ...instrument,
        id: 'benchmark-1',
        symbol: 'SPY',
        providerSymbol: 'SPY',
      });

      await service.ingestDaily();

      expect(provider.getCandles).toHaveBeenCalledWith('SPY', 'daily', 1);
      expect(prisma.ohlcvCandle.upsert).toHaveBeenCalledTimes(1);
    });

    it('upserts on the (instrumentId, interval, timestamp) key so repeated ingestion does not duplicate', async () => {
      await service.ingestDaily();
      await service.ingestDaily();

      expect(prisma.ohlcvCandle.upsert).toHaveBeenCalledTimes(2);
      const expectedWhere = {
        where: {
          instrumentId_interval_timestamp: {
            instrumentId: 'inst-1',
            interval: CandleInterval.daily,
            timestamp: candle.timestamp,
          },
        },
      };
      expect(prisma.ohlcvCandle.upsert.mock.calls[0][0]).toMatchObject(
        expectedWhere,
      );
      expect(prisma.ohlcvCandle.upsert.mock.calls[1][0]).toMatchObject(
        expectedWhere,
      );
    });
  });

  describe('ingestIntraday', () => {
    it('skips entirely when the market is closed, making no provider calls', async () => {
      await service.ingestIntraday(WEEKEND_NOW);

      expect(
        watchlistedInstruments.getDistinctInstrumentIds,
      ).not.toHaveBeenCalled();
      expect(prisma.ohlcvCandle.groupBy).not.toHaveBeenCalled();
      expect(provider.getCandles).not.toHaveBeenCalled();
    });

    it('skips the provider call for an instrument whose latest candle is already current', async () => {
      prisma.ohlcvCandle.groupBy.mockResolvedValue([
        {
          instrumentId: 'inst-1',
          // 1 minute old - well inside the 5-minute bar interval.
          _max: { timestamp: new Date(OPEN_MARKET_NOW.getTime() - 60 * 1000) },
        },
      ]);

      await service.ingestIntraday(OPEN_MARKET_NOW);

      expect(provider.getCandles).not.toHaveBeenCalled();
      expect(prisma.ohlcvCandle.upsert).not.toHaveBeenCalled();
    });

    it('fetches when the latest candle is due for refresh (past the 5-minute interval)', async () => {
      prisma.ohlcvCandle.groupBy.mockResolvedValue([
        {
          instrumentId: 'inst-1',
          // 6 minutes old - past the 5-minute bar interval.
          _max: {
            timestamp: new Date(OPEN_MARKET_NOW.getTime() - 6 * 60 * 1000),
          },
        },
      ]);

      await service.ingestIntraday(OPEN_MARKET_NOW);

      expect(provider.getCandles).toHaveBeenCalledWith(
        'AAPL',
        'intraday_5m',
        1,
      );
      expect(prisma.ohlcvCandle.upsert).toHaveBeenCalledTimes(1);
    });

    it('fetches when an instrument has no stored intraday candle yet', async () => {
      prisma.ohlcvCandle.groupBy.mockResolvedValue([]);

      await service.ingestIntraday(OPEN_MARKET_NOW);

      expect(provider.getCandles).toHaveBeenCalledWith(
        'AAPL',
        'intraday_5m',
        1,
      );
    });

    it('logs and continues past a provider failure for one instrument without throwing', async () => {
      watchlistedInstruments.getDistinctInstrumentIds.mockResolvedValue([
        'inst-1',
        'inst-2',
      ]);
      prisma.ohlcvCandle.groupBy.mockResolvedValue([]);
      prisma.instrument.findUnique
        .mockResolvedValueOnce(instrument)
        .mockResolvedValueOnce({
          ...instrument,
          id: 'inst-2',
          symbol: 'MSFT',
          providerSymbol: 'MSFT',
        });
      provider.getCandles
        .mockRejectedValueOnce(new Error('rate limit exceeded'))
        .mockResolvedValueOnce([candle]);

      await expect(
        service.ingestIntraday(OPEN_MARKET_NOW),
      ).resolves.toBeUndefined();

      expect(provider.getCandles).toHaveBeenCalledTimes(2);
      expect(prisma.ohlcvCandle.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
