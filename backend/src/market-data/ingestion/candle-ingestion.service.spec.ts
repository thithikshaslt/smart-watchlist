import { CandleInterval, Instrument } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataProvider } from '../market-data-provider.interface';
import { TwelveDataRateLimiterService } from '../twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from '../watchlisted-instruments.service';
import { CandleIngestionService } from './candle-ingestion.service';

describe('CandleIngestionService', () => {
  let prisma: {
    instrument: { findUnique: jest.Mock };
    ohlcvCandle: { upsert: jest.Mock };
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

  beforeEach(() => {
    prisma = {
      instrument: { findUnique: jest.fn().mockResolvedValue(instrument) },
      ohlcvCandle: { upsert: jest.fn() },
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
