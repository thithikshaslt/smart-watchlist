import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CURRENT_THRESHOLD_MS } from './freshness';

@Injectable()
export class WatchlistedInstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDistinctInstrumentIds(): Promise<string[]> {
    const rows = await this.prisma.watchlistItem.findMany({
      distinct: ['instrumentId'],
      select: { instrumentId: true },
    });
    return rows.map((row) => row.instrumentId);
  }

  /**
   * Distinct watchlisted instrument IDs whose quote is due for a refresh
   * (never ingested, or older than the "current" freshness threshold),
   * staler (or never-ingested) first. Excludes instruments that are still
   * fresh so the rate-limited provider budget isn't spent re-confirming
   * data that's already good enough - re-fetching every instrument on
   * every tick regardless of actual staleness burns through a free-tier
   * daily quota in hours even for a small watchlist.
   */
  async getIdsDueForQuoteRefresh(now: Date = new Date()): Promise<string[]> {
    const ids = await this.getDistinctInstrumentIds();
    if (ids.length === 0) {
      return [];
    }

    const quotes = await this.prisma.latestQuote.findMany({
      where: { instrumentId: { in: ids } },
      select: { instrumentId: true, ingestedAt: true },
    });
    const ingestedAtById = new Map(
      quotes.map((quote) => [quote.instrumentId, quote.ingestedAt]),
    );

    const due = ids.filter((id) => {
      const ingestedAt = ingestedAtById.get(id);
      if (!ingestedAt) {
        return true;
      }
      return now.getTime() - ingestedAt.getTime() >= CURRENT_THRESHOLD_MS;
    });

    return due.sort((a, b) => {
      const aTime = ingestedAtById.get(a)?.getTime() ?? 0;
      const bTime = ingestedAtById.get(b)?.getTime() ?? 0;
      return aTime - bTime;
    });
  }
}
