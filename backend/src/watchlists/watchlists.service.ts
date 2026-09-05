import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Watchlist } from '@prisma/client';
import { InstrumentsService } from '../instruments/instruments.service';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

type WatchlistWithItems = Prisma.WatchlistGetPayload<{
  include: { items: { include: { instrument: true } } };
}>;

@Injectable()
export class WatchlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instrumentsService: InstrumentsService,
  ) {}

  create(userId: string, name: string): Promise<Watchlist> {
    return this.prisma.watchlist.create({ data: { userId, name } });
  }

  listForUser(userId: string): Promise<WatchlistWithItems[]> {
    return this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        items: { include: { instrument: true }, orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOwned(
    userId: string,
    watchlistId: string,
  ): Promise<WatchlistWithItems> {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
      include: {
        items: { include: { instrument: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!watchlist) {
      throw new NotFoundException(`Watchlist ${watchlistId} not found`);
    }
    return watchlist;
  }

  async rename(
    userId: string,
    watchlistId: string,
    name: string,
  ): Promise<Watchlist> {
    await this.getOwned(userId, watchlistId);
    return this.prisma.watchlist.update({
      where: { id: watchlistId },
      data: { name },
    });
  }

  async remove(userId: string, watchlistId: string): Promise<void> {
    await this.getOwned(userId, watchlistId);
    await this.prisma.watchlist.delete({ where: { id: watchlistId } });
  }

  async addItem(
    userId: string,
    watchlistId: string,
    instrumentId: string,
  ): Promise<WatchlistWithItems> {
    const watchlist = await this.getOwned(userId, watchlistId);

    const instrument = await this.instrumentsService.findById(instrumentId);
    if (!instrument) {
      throw new NotFoundException(`Instrument ${instrumentId} not found`);
    }

    const nextPosition =
      watchlist.items.reduce((max, item) => Math.max(max, item.position), -1) +
      1;

    try {
      await this.prisma.watchlistItem.create({
        data: { watchlistId, instrumentId, position: nextPosition },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(
          `Instrument ${instrumentId} is already in watchlist ${watchlistId}`,
        );
      }
      throw error;
    }

    return this.getOwned(userId, watchlistId);
  }

  async removeItem(
    userId: string,
    watchlistId: string,
    instrumentId: string,
  ): Promise<void> {
    await this.getOwned(userId, watchlistId);
    const result = await this.prisma.watchlistItem.deleteMany({
      where: { watchlistId, instrumentId },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `Instrument ${instrumentId} is not in watchlist ${watchlistId}`,
      );
    }
  }

  async reorder(
    userId: string,
    watchlistId: string,
    orderedInstrumentIds: string[],
  ): Promise<WatchlistWithItems> {
    const watchlist = await this.getOwned(userId, watchlistId);

    const currentInstrumentIds = new Set(
      watchlist.items.map((item) => item.instrumentId),
    );
    const requestedInstrumentIds = new Set(orderedInstrumentIds);
    const sameSize = currentInstrumentIds.size === requestedInstrumentIds.size;
    const sameMembers =
      sameSize &&
      [...currentInstrumentIds].every((id) => requestedInstrumentIds.has(id));
    if (!sameMembers) {
      throw new BadRequestException(
        'Reorder must include exactly the instruments currently in the watchlist',
      );
    }

    await this.prisma.$transaction(
      orderedInstrumentIds.map((instrumentId, position) =>
        this.prisma.watchlistItem.update({
          where: { watchlistId_instrumentId: { watchlistId, instrumentId } },
          data: { position },
        }),
      ),
    );

    return this.getOwned(userId, watchlistId);
  }
}
