import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BENCHMARK_SYMBOLS } from './benchmark-instruments';
import { CURRENT_THRESHOLD_MS } from './freshness';

@Injectable()
export class WatchlistedInstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Distinct instrument IDs that should stay ingested: every instrument
   * present in at least one watchlist, plus the fixed benchmark set (see
   * benchmark-instruments.ts) - a benchmark must stay fresh for smart-insights
   * even when no user has watchlisted it.
   */
  async getDistinctInstrumentIds(): Promise<string[]> {
    const [watchlisted, benchmarks] = await Promise.all([
      this.prisma.watchlistItem.findMany({
        distinct: ['instrumentId'],
        select: { instrumentId: true },
      }),
      this.prisma.instrument.findMany({
        where: { symbol: { in: BENCHMARK_SYMBOLS } },
        select: { id: true },
      }),
    ]);

    const ids = new Set(watchlisted.map((row) => row.instrumentId));
    for (const benchmark of benchmarks) {
      ids.add(benchmark.id);
    }
    return [...ids];
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
