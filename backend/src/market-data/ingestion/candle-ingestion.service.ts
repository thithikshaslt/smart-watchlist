import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CandleInterval } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
 */
@Injectable()
export class CandleIngestionService {
  private readonly logger = new Logger(CandleIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly watchlistedInstruments: WatchlistedInstrumentsService,
    private readonly rateLimiter: TwelveDataRateLimiterService,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ingestIntraday(): Promise<void> {
    await this.ingestForAllWatchlisted(
      'intraday_5m',
      CandleInterval.intraday_5m,
    );
  }

  @Cron('0 2 * * *')
  async ingestDaily(): Promise<void> {
    await this.ingestForAllWatchlisted('daily', CandleInterval.daily);
  }

  private async ingestForAllWatchlisted(
    providerInterval: CandleIntervalKey,
    dbInterval: CandleInterval,
  ): Promise<void> {
    const instrumentIds =
      await this.watchlistedInstruments.getDistinctInstrumentIds();

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
