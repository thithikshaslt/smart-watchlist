import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
} from '../market-data-provider.interface';
import { TwelveDataRateLimiterService } from '../twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from '../watchlisted-instruments.service';

/**
 * Rate-limited priority queue for quote ingestion (design.md - Market data
 * provider: Twelve Data integration). Every tick, the distinct watchlisted
 * instruments that are actually due for a refresh (never ingested, or past
 * the "current" freshness threshold) are ordered stalest-first and drained
 * against the shared Twelve Data rate limiter - there is no guaranteed
 * per-instrument cadence, and an instrument that's still fresh is skipped
 * rather than re-fetched, so the provider budget isn't spent confirming
 * data that's already good enough.
 */
@Injectable()
export class QuoteIngestionService {
  private readonly logger = new Logger(QuoteIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly watchlistedInstruments: WatchlistedInstrumentsService,
    private readonly rateLimiter: TwelveDataRateLimiterService,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
  ) {}

  @Interval(60_000)
  async tick(): Promise<void> {
    const due = await this.watchlistedInstruments.getIdsDueForQuoteRefresh();

    for (const instrumentId of due) {
      if (!this.rateLimiter.tryAcquire()) {
        break;
      }
      await this.ingestOne(instrumentId);
    }
  }

  private async ingestOne(instrumentId: string): Promise<void> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id: instrumentId },
    });
    if (!instrument) {
      return;
    }

    try {
      const quote = await this.provider.getQuote(instrument.providerSymbol);
      await this.prisma.latestQuote.upsert({
        where: { instrumentId },
        create: {
          instrumentId,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          providerTimestamp: quote.providerTimestamp,
          ingestedAt: new Date(),
        },
        update: {
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          providerTimestamp: quote.providerTimestamp,
          ingestedAt: new Date(),
        },
      });
    } catch (error) {
      // Ingestion failures leave the prior LatestQuote row untouched; freshness
      // is computed at read time from ingestedAt, so the quote ages naturally.
      this.logger.warn(
        `Quote ingestion failed for instrument ${instrumentId} (${instrument.providerSymbol}): ${(error as Error).message}`,
      );
    }
  }
}
