import { BadRequestException, Injectable } from '@nestjs/common';
import { CandleInterval } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeFreshness, FreshnessStatus } from './freshness';

export interface QuoteView {
  instrumentId: string;
  price: number;
  change: number;
  changePercent: number;
  providerTimestamp: Date;
  ingestedAt: Date;
  freshness: FreshnessStatus;
  /**
   * High/low and volume from the most recently completed daily candle, for
   * the optional "day range"/"volume" display-lens metrics. Sourced from the
   * last completed trading day, not a live running total for today - reusing
   * existing OHLCV storage rather than adding a new ingested field. Null
   * until at least one daily candle has been ingested for the instrument.
   */
  dayRange: { high: number; low: number } | null;
  volume: number | null;
}

export interface CandleView {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** range -> [resolution to serve it at, lookback window] */
const RANGE_WINDOWS: Record<
  string,
  { interval: CandleInterval; lookbackMs: number }
> = {
  '1d': { interval: CandleInterval.intraday_5m, lookbackMs: 1 * DAY_MS },
  '5d': { interval: CandleInterval.intraday_5m, lookbackMs: 5 * DAY_MS },
  '1m': { interval: CandleInterval.daily, lookbackMs: 31 * DAY_MS },
  '3m': { interval: CandleInterval.daily, lookbackMs: 92 * DAY_MS },
  '6m': { interval: CandleInterval.daily, lookbackMs: 183 * DAY_MS },
  '1y': { interval: CandleInterval.daily, lookbackMs: 365 * DAY_MS },
  '5y': { interval: CandleInterval.daily, lookbackMs: 5 * 365 * DAY_MS },
};

@Injectable()
export class MarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestQuote(instrumentId: string): Promise<QuoteView | null> {
    const quote = await this.prisma.latestQuote.findUnique({
      where: { instrumentId },
    });
    if (!quote) {
      return null;
    }

    const latestDailyCandle = await this.prisma.ohlcvCandle.findFirst({
      where: { instrumentId, interval: CandleInterval.daily },
      orderBy: { timestamp: 'desc' },
    });

    return {
      instrumentId: quote.instrumentId,
      price: Number(quote.price),
      change: Number(quote.change),
      changePercent: Number(quote.changePercent),
      providerTimestamp: quote.providerTimestamp,
      ingestedAt: quote.ingestedAt,
      freshness: computeFreshness(quote.ingestedAt),
      dayRange: latestDailyCandle
        ? {
            high: Number(latestDailyCandle.high),
            low: Number(latestDailyCandle.low),
          }
        : null,
      volume: latestDailyCandle ? Number(latestDailyCandle.volume) : null,
    };
  }

  async getHistory(instrumentId: string, range: string): Promise<CandleView[]> {
    const window = RANGE_WINDOWS[range];
    if (!window) {
      throw new BadRequestException(
        `Unsupported range '${range}'. Supported ranges: ${Object.keys(RANGE_WINDOWS).join(', ')}`,
      );
    }

    const since = new Date(Date.now() - window.lookbackMs);
    const candles = await this.prisma.ohlcvCandle.findMany({
      where: {
        instrumentId,
        interval: window.interval,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });

    return candles.map((candle) => ({
      timestamp: candle.timestamp,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume),
    }));
  }
}
