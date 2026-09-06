import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CandleInterval } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isMarketClosed } from '../market-hours';
import {
  CandleIntervalKey,
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
} from '../market-data-provider.interface';
import { TwelveDataRateLimiterService } from '../twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from '../watchlisted-instruments.service';

/**
 * Scheduled OHLCV ingestion (design.md - Market data provider: Twelve Data
 * integration). Runs on its own schedule per resolution, independent of the
 * quote priority queue, but draws from the same shared rate limiter.
 *
 * Intraday ingestion additionally skips entirely while the market is closed
 * (weekends, at minimum) and, per instrument, skips the provider call when
 * the latest stored 5-minute candle is already current - unconditionally
 * re-fetching every watchlisted instrument every 5 minutes regardless of
 * whether a new bar could even exist burns through a free-tier daily quota
 * for no new data. Daily ingestion runs once a day and isn't worth the same
 * treatment.
 */
@Injectable()
export class CandleIngestionService {
  private static readonly INTRADAY_INTERVAL_MS = 5 * 60 * 1000;

  private readonly logger = new Logger(CandleIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly watchlistedInstruments: WatchlistedInstrumentsService,
    private readonly rateLimiter: TwelveDataRateLimiterService,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ingestIntraday(now: Date = new Date()): Promise<void> {
    if (isMarketClosed(now)) {
      return;
    }

    const instrumentIds =
      await this.watchlistedInstruments.getDistinctInstrumentIds();
    const due = await this.filterDueForIntraday(instrumentIds, now);
    await this.ingestAll(due, 'intraday_5m', CandleInterval.intraday_5m);
  }

  @Cron('0 2 * * *')
  async ingestDaily(): Promise<void> {
    const instrumentIds =
      await this.watchlistedInstruments.getDistinctInstrumentIds();
    await this.ingestAll(instrumentIds, 'daily', CandleInterval.daily);
  }

  private async filterDueForIntraday(
    instrumentIds: string[],
    now: Date,
  ): Promise<string[]> {
    if (instrumentIds.length === 0) {
      return [];
    }

    const latest = await this.prisma.ohlcvCandle.groupBy({
      by: ['instrumentId'],
      where: {
        instrumentId: { in: instrumentIds },
        interval: CandleInterval.intraday_5m,
      },
      _max: { timestamp: true },
    });
    const latestTimestampById = new Map(
      latest.map((row) => [row.instrumentId, row._max.timestamp]),
    );

    return instrumentIds.filter((id) => {
      const latestTimestamp = latestTimestampById.get(id);
      if (!latestTimestamp) {
        return true;
      }
      return (
        now.getTime() - latestTimestamp.getTime() >=
        CandleIngestionService.INTRADAY_INTERVAL_MS
      );
    });
  }

  private async ingestAll(
    instrumentIds: string[],
    providerInterval: CandleIntervalKey,
    dbInterval: CandleInterval,
  ): Promise<void> {
    for (const instrumentId of instrumentIds) {
      if (!this.rateLimiter.tryAcquire()) {
        break;
      }
      await this.ingestOne(instrumentId, providerInterval, dbInterval);
    }
  }

  private async ingestOne(
    instrumentId: string,
    providerInterval: CandleIntervalKey,
    dbInterval: CandleInterval,
  ): Promise<void> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id: instrumentId },
    });
    if (!instrument) {
      return;
    }

    try {
      const candles = await this.provider.getCandles(
        instrument.providerSymbol,
        providerInterval,
        1,
      );
      for (const candle of candles) {
        await this.prisma.ohlcvCandle.upsert({
          where: {
            instrumentId_interval_timestamp: {
              instrumentId,
              interval: dbInterval,
              timestamp: candle.timestamp,
            },
          },
          create: {
            instrumentId,
            interval: dbInterval,
            timestamp: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          },
          update: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Candle ingestion (${providerInterval}) failed for instrument ${instrumentId} (${instrument.providerSymbol}): ${(error as Error).message}`,
      );
    }
  }
}
