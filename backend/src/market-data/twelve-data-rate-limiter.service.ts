import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

/**
 * Shared budget for Twelve Data's free-tier 8 requests/minute cap.
 * Quote ingestion and candle ingestion both draw from this single pool
 * (design.md - Market data provider: Twelve Data integration).
 */
@Injectable()
export class TwelveDataRateLimiterService {
  private static readonly CAPACITY = 8;
  private tokens = TwelveDataRateLimiterService.CAPACITY;

  @Interval(60_000)
  refill(): void {
    this.tokens = TwelveDataRateLimiterService.CAPACITY;
  }

  tryAcquire(): boolean {
    if (this.tokens <= 0) {
      return false;
    }
    this.tokens -= 1;
    return true;
  }
}
