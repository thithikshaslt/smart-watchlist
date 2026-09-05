import { Instrument } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataProvider } from '../market-data-provider.interface';
import { TwelveDataRateLimiterService } from '../twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from '../watchlisted-instruments.service';
import { QuoteIngestionService } from './quote-ingestion.service';

describe('QuoteIngestionService', () => {
  let prisma: {
    instrument: { findUnique: jest.Mock };
    latestQuote: { upsert: jest.Mock };
  };
  let watchlistedInstruments: jest.Mocked<WatchlistedInstrumentsService>;
  let provider: jest.Mocked<MarketDataProvider>;
  let rateLimiter: TwelveDataRateLimiterService;
  let service: QuoteIngestionService;

  const instrument = (id: string): Instrument => ({
    id,
    symbol: id.toUpperCase(),
    name: `${id} Inc.`,
    exchange: 'NASDAQ',
    providerSymbol: id.toUpperCase(),
    createdAt: new Date(),
  });

  beforeEach(() => {
    prisma = {
      instrument: {
        findUnique: jest.fn((args: { where: { id: string } }) =>
          instrument(args.where.id),
        ),
      },
      latestQuote: { upsert: jest.fn() },
    };
    watchlistedInstruments = {
      getIdsDueForQuoteRefresh: jest.fn(),
      getDistinctInstrumentIds: jest.fn(),
    } as unknown as jest.Mocked<WatchlistedInstrumentsService>;
    provider = { getQuote: jest.fn(), getCandles: jest.fn() };
    rateLimiter = new TwelveDataRateLimiterService();

    service = new QuoteIngestionService(
      prisma as unknown as PrismaService,
      watchlistedInstruments,
      rateLimiter,
      provider,
    );
  });

  it('ingests at most 8 instruments per tick, respecting the shared rate limit', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `inst-${i}`);
    watchlistedInstruments.getIdsDueForQuoteRefresh.mockResolvedValue(ids);
    provider.getQuote.mockResolvedValue({
      price: 1,
      change: 0,
      changePercent: 0,
      providerTimestamp: new Date(),
    });

    await service.tick();

    expect(provider.getQuote).toHaveBeenCalledTimes(8);
  });

  it('upserts the new quote into LatestQuote on a successful ingestion', async () => {
    watchlistedInstruments.getIdsDueForQuoteRefresh.mockResolvedValue([
      'inst-1',
    ]);
    const providerTimestamp = new Date('2026-01-01T00:00:00Z');
    provider.getQuote.mockResolvedValue({
      price: 150.25,
      change: 1.5,
      changePercent: 1.01,
      providerTimestamp,
    });

    await service.tick();

    expect(prisma.latestQuote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instrumentId: 'inst-1' },
        create: expect.objectContaining({
          instrumentId: 'inst-1',
          price: 150.25,
          change: 1.5,
          changePercent: 1.01,
          providerTimestamp,
        }),
        update: expect.objectContaining({
          price: 150.25,
          change: 1.5,
          changePercent: 1.01,
          providerTimestamp,
        }),
      }),
    );
  });

  it('leaves the prior quote untouched when the provider call fails', async () => {
    watchlistedInstruments.getIdsDueForQuoteRefresh.mockResolvedValue([
      'inst-fail',
    ]);
    provider.getQuote.mockRejectedValue(new Error('provider unavailable'));

    await expect(service.tick()).resolves.toBeUndefined();

    expect(prisma.latestQuote.upsert).not.toHaveBeenCalled();
  });
});
