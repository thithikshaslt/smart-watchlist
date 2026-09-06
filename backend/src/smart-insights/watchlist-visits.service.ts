import { Injectable } from '@nestjs/common';
import { CandleInterval } from '@prisma/client';
import { BENCHMARK_SYMBOLS } from '../market-data/benchmark-instruments';
import { PrismaService } from '../prisma/prisma.service';
import { WatchlistsService } from '../watchlists/watchlists.service';
import { classifyInstrumentMove, MoveClassification } from './significance';
import { findClosestAtOrBefore } from './value-at-time';

// Only advance the watermark if it's been at least this long since the
// previous visit, so a hard refresh or a brief tab-switch can't silently
// collapse a multi-day "since last visit" window down to a few seconds
// (design.md - "Visit watermark").
const MIN_VISIT_GAP_MS = 20 * 60 * 1000;

// Enough daily bars for a 20-day ATR plus slack for weekends/holidays.
const DAILY_HISTORY_LOOKBACK = 40;

interface DailyCandleWithTimestamp {
  high: number;
  low: number;
  close: number;
  timestamp: Date;
}

export interface VisitItemResult {
  instrumentId: string;
  classification: MoveClassification | null;
}

export interface VisitResult {
  previousViewedAt: Date | null;
  items: VisitItemResult[];
  summary: { notableCount: number; broadMarketCount: number };
}

@Injectable()
export class WatchlistVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly watchlistsService: WatchlistsService,
  ) {}

  async recordVisit(userId: string, watchlistId: string): Promise<VisitResult> {
    const watchlist = await this.watchlistsService.getOwned(
      userId,
      watchlistId,
    );
    const previousViewedAt = watchlist.lastViewedAt;
    const now = new Date();

    if (!previousViewedAt) {
      await this.prisma.watchlist.update({
        where: { id: watchlistId },
        data: { lastViewedAt: now },
      });
      return {
        previousViewedAt: null,
        items: watchlist.items.map((item) => ({
          instrumentId: item.instrumentId,
          classification: null,
        })),
        summary: { notableCount: 0, broadMarketCount: 0 },
      };
    }

    const benchmarkInstrument = await this.prisma.instrument.findFirst({
      where: { symbol: { in: BENCHMARK_SYMBOLS } },
    });

    const items = await Promise.all(
      watchlist.items.map((item) =>
        this.classifyItem(
          item.instrumentId,
          previousViewedAt,
          now,
          benchmarkInstrument?.id ?? null,
        ),
      ),
    );

    const elapsedMs = now.getTime() - previousViewedAt.getTime();
    if (elapsedMs >= MIN_VISIT_GAP_MS) {
      await this.prisma.watchlist.update({
        where: { id: watchlistId },
        data: { lastViewedAt: now },
      });
    }

    return {
      previousViewedAt,
      items,
      summary: {
        notableCount: items.filter((i) => i.classification === 'notable')
          .length,
        broadMarketCount: items.filter(
          (i) => i.classification === 'broad-market',
        ).length,
      },
    };
  }

  private async classifyItem(
    instrumentId: string,
    previousViewedAt: Date,
    now: Date,
    benchmarkInstrumentId: string | null,
  ): Promise<VisitItemResult> {
    if (!benchmarkInstrumentId || benchmarkInstrumentId === instrumentId) {
      // No benchmark configured, or this item IS the benchmark - nothing
      // meaningful to compare it against.
      return { instrumentId, classification: null };
    }

    const [
      currentQuote,
      dailyCandles,
      benchmarkCurrentQuote,
      benchmarkDailyCandles,
    ] = await Promise.all([
      this.prisma.latestQuote.findUnique({ where: { instrumentId } }),
      this.getAscendingDailyCandles(instrumentId),
      this.prisma.latestQuote.findUnique({
        where: { instrumentId: benchmarkInstrumentId },
      }),
      this.getAscendingDailyCandles(benchmarkInstrumentId),
    ]);

    if (!currentQuote || !benchmarkCurrentQuote) {
      return { instrumentId, classification: null };
    }

    const [priorValue, benchmarkPriorValue] = await Promise.all([
      this.getValueAtTime(instrumentId, previousViewedAt, now, dailyCandles),
      this.getValueAtTime(
        benchmarkInstrumentId,
        previousViewedAt,
        now,
        benchmarkDailyCandles,
      ),
    ]);

    if (priorValue === null || benchmarkPriorValue === null) {
      return { instrumentId, classification: null };
    }

    const classification = classifyInstrumentMove({
      dailyCandles,
      currentPrice: Number(currentQuote.price),
      priorPrice: priorValue,
      benchmarkCurrentPrice: Number(benchmarkCurrentQuote.price),
      benchmarkPriorPrice: benchmarkPriorValue,
      elapsedMs: now.getTime() - previousViewedAt.getTime(),
    });

    return { instrumentId, classification };
  }

  private async getAscendingDailyCandles(
    instrumentId: string,
  ): Promise<DailyCandleWithTimestamp[]> {
    const rows = await this.prisma.ohlcvCandle.findMany({
      where: { instrumentId, interval: CandleInterval.daily },
      orderBy: { timestamp: 'desc' },
      take: DAILY_HISTORY_LOOKBACK,
    });
    return rows
      .slice()
      .reverse()
      .map((row) => ({
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        timestamp: row.timestamp,
      }));
  }

  /**
   * Value of an instrument as of `target`. Reuses the already-fetched daily
   * candle series when `target` falls on an earlier calendar day; only issues
   * an extra (bounded, same-day) intraday query when `target` is today, since
   * daily candles alone can't resolve an intraday timestamp.
   */
  private async getValueAtTime(
    instrumentId: string,
    target: Date,
    now: Date,
    dailyCandlesAscending: DailyCandleWithTimestamp[],
  ): Promise<number | null> {
    const isSameUtcDay =
      target.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

    if (isSameUtcDay) {
      const startOfDay = new Date(
        `${target.toISOString().slice(0, 10)}T00:00:00.000Z`,
      );
      const rows = await this.prisma.ohlcvCandle.findMany({
        where: {
          instrumentId,
          interval: CandleInterval.intraday_5m,
          timestamp: { gte: startOfDay, lte: target },
        },
        orderBy: { timestamp: 'asc' },
      });
      const closest = findClosestAtOrBefore(rows, target);
      return closest ? Number(closest.close) : null;
    }

    const closest = findClosestAtOrBefore(dailyCandlesAscending, target);
    return closest ? closest.close : null;
  }
}
