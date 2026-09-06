import { BadRequestException } from '@nestjs/common';
import { CandleInterval } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from './market-data.service';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let prisma: {
    latestQuote: { findUnique: jest.Mock };
    ohlcvCandle: { findMany: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      latestQuote: { findUnique: jest.fn() },
      ohlcvCandle: { findMany: jest.fn(), findFirst: jest.fn() },
    };
    service = new MarketDataService(prisma as unknown as PrismaService);
  });

  describe('getLatestQuote', () => {
    it('returns null when no quote has been ingested', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue(null);

      const result = await service.getLatestQuote('inst-1');

      expect(result).toBeNull();
    });

    it('returns the quote with a computed freshness status', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue({
        instrumentId: 'inst-1',
        price: 100,
        change: 1,
        changePercent: 1,
        providerTimestamp: new Date(),
        ingestedAt: new Date(),
      });
      prisma.ohlcvCandle.findFirst.mockResolvedValue(null);

      const result = await service.getLatestQuote('inst-1');

      expect(result?.freshness).toBe('current');
      expect(result?.price).toBe(100);
    });

    it('includes day range and volume from the latest completed daily candle', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue({
        instrumentId: 'inst-1',
        price: 100,
        change: 1,
        changePercent: 1,
        providerTimestamp: new Date(),
        ingestedAt: new Date(),
      });
      prisma.ohlcvCandle.findFirst.mockResolvedValue({
        high: 105,
        low: 98,
        volume: 123456,
      });

      const result = await service.getLatestQuote('inst-1');

      expect(result?.dayRange).toEqual({ high: 105, low: 98 });
      expect(result?.volume).toBe(123456);
    });

    it('reports no day range or volume when no daily candle has been ingested yet', async () => {
      prisma.latestQuote.findUnique.mockResolvedValue({
        instrumentId: 'inst-1',
        price: 100,
        change: 1,
        changePercent: 1,
        providerTimestamp: new Date(),
        ingestedAt: new Date(),
      });
      prisma.ohlcvCandle.findFirst.mockResolvedValue(null);

      const result = await service.getLatestQuote('inst-1');

      expect(result?.dayRange).toBeNull();
      expect(result?.volume).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('rejects an unsupported range', async () => {
      await expect(
        service.getHistory('inst-1', 'nonsense'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('resolves short ranges to intraday candles', async () => {
      prisma.ohlcvCandle.findMany.mockResolvedValue([]);

      await service.getHistory('inst-1', '1d');

      expect(prisma.ohlcvCandle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            interval: CandleInterval.intraday_5m,
          }),
        }),
      );
    });

    it('resolves long ranges to daily candles', async () => {
      prisma.ohlcvCandle.findMany.mockResolvedValue([]);

      await service.getHistory('inst-1', '6m');

      expect(prisma.ohlcvCandle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ interval: CandleInterval.daily }),
        }),
      );
    });
  });
});
