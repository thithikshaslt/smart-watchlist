import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Instrument, Prisma, Watchlist, WatchlistItem } from '@prisma/client';
import { InstrumentsService } from '../instruments/instruments.service';
import { PrismaService } from '../prisma/prisma.service';
import { WatchlistsService } from './watchlists.service';

type WatchlistItemWithInstrument = WatchlistItem & { instrument: Instrument };
type WatchlistWithItems = Watchlist & { items: WatchlistItemWithInstrument[] };

describe('WatchlistsService', () => {
  let service: WatchlistsService;
  let prisma: {
    watchlist: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    watchlistItem: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let instrumentsService: jest.Mocked<InstrumentsService>;

  const userId = 'user-1';
  const watchlistId = 'watchlist-1';

  const instrument = (id: string): Instrument => ({
    id,
    symbol: id.toUpperCase(),
    name: `${id} Inc.`,
    exchange: 'NASDAQ',
    providerSymbol: id.toUpperCase(),
    createdAt: new Date(),
  });

  const watchlistWithItems = (
    items: WatchlistItemWithInstrument[],
  ): WatchlistWithItems => ({
    id: watchlistId,
    userId,
    name: 'Tech',
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
  });

  const item = (
    instrumentId: string,
    position: number,
  ): WatchlistItemWithInstrument => ({
    id: `item-${instrumentId}`,
    watchlistId,
    instrumentId,
    position,
    createdAt: new Date(),
    instrument: instrument(instrumentId),
  });

  beforeEach(() => {
    prisma = {
      watchlist: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      watchlistItem: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    instrumentsService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<InstrumentsService>;

    service = new WatchlistsService(
      prisma as unknown as PrismaService,
      instrumentsService,
    );
  });

  describe('getOwned', () => {
    it('throws NotFoundException when the watchlist does not exist or is not owned by the caller', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(null);

      await expect(
        service.getOwned(userId, watchlistId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.watchlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: watchlistId, userId } }),
      );
    });
  });

  describe('addItem', () => {
    it('assigns the next position and adds the item when the instrument exists', async () => {
      prisma.watchlist.findFirst
        .mockResolvedValueOnce(watchlistWithItems([item('aapl', 0)]))
        .mockResolvedValueOnce(
          watchlistWithItems([item('aapl', 0), item('msft', 1)]),
        );
      instrumentsService.findById.mockResolvedValue(instrument('msft'));
      prisma.watchlistItem.create.mockResolvedValue(item('msft', 1));

      const result = await service.addItem(userId, watchlistId, 'msft');

      expect(prisma.watchlistItem.create).toHaveBeenCalledWith({
        data: { watchlistId, instrumentId: 'msft', position: 1 },
      });
      expect(result.items).toHaveLength(2);
    });

    it('throws NotFoundException when the instrument does not exist', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(watchlistWithItems([]));
      instrumentsService.findById.mockResolvedValue(null);

      await expect(
        service.addItem(userId, watchlistId, 'unknown'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the instrument is already in the watchlist', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(
        watchlistWithItems([item('aapl', 0)]),
      );
      instrumentsService.findById.mockResolvedValue(instrument('aapl'));
      prisma.watchlistItem.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.addItem(userId, watchlistId, 'aapl'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('removeItem', () => {
    it('throws NotFoundException when the instrument is not in the watchlist', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(watchlistWithItems([]));
      prisma.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.removeItem(userId, watchlistId, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the item when present', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(
        watchlistWithItems([item('aapl', 0)]),
      );
      prisma.watchlistItem.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.removeItem(userId, watchlistId, 'aapl'),
      ).resolves.toBeUndefined();
    });
  });

  describe('reorder', () => {
    it('rejects a reorder that does not match the current item set exactly', async () => {
      prisma.watchlist.findFirst.mockResolvedValue(
        watchlistWithItems([item('aapl', 0), item('msft', 1)]),
      );

      await expect(
        service.reorder(userId, watchlistId, ['aapl']),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists the new order transactionally when valid', async () => {
      prisma.watchlist.findFirst
        .mockResolvedValueOnce(
          watchlistWithItems([item('aapl', 0), item('msft', 1)]),
        )
        .mockResolvedValueOnce(
          watchlistWithItems([item('msft', 0), item('aapl', 1)]),
        );
      prisma.watchlistItem.update.mockResolvedValue({});

      await service.reorder(userId, watchlistId, ['msft', 'aapl']);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.watchlistItem.update).toHaveBeenNthCalledWith(1, {
        where: {
          watchlistId_instrumentId: { watchlistId, instrumentId: 'msft' },
        },
        data: { position: 0 },
      });
      expect(prisma.watchlistItem.update).toHaveBeenNthCalledWith(2, {
        where: {
          watchlistId_instrumentId: { watchlistId, instrumentId: 'aapl' },
        },
        data: { position: 1 },
      });
    });
  });
});
