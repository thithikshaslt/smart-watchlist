import { Instrument } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InstrumentsService } from './instruments.service';

describe('InstrumentsService', () => {
  let service: InstrumentsService;
  let prisma: { instrument: { findMany: jest.Mock; findUnique: jest.Mock } };

  const instrument: Instrument = {
    id: 'inst-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    providerSymbol: 'AAPL',
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      instrument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new InstrumentsService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('queries by case-insensitive symbol or name match', async () => {
      prisma.instrument.findMany.mockResolvedValue([instrument]);

      const result = await service.search('aapl');

      expect(result).toEqual([instrument]);
      expect(prisma.instrument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { symbol: { contains: 'aapl', mode: 'insensitive' } },
              { name: { contains: 'aapl', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('returns an empty array when nothing matches', async () => {
      prisma.instrument.findMany.mockResolvedValue([]);

      const result = await service.search('zzz-no-match');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns the instrument when found', async () => {
      prisma.instrument.findUnique.mockResolvedValue(instrument);

      const result = await service.findById('inst-1');

      expect(result).toEqual(instrument);
    });

    it('returns null when not found', async () => {
      prisma.instrument.findUnique.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });
});
