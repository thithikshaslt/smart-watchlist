import { TwelveDataRateLimiterService } from './twelve-data-rate-limiter.service';

describe('TwelveDataRateLimiterService', () => {
  it('allows at most 8 acquisitions per minute', () => {
    const limiter = new TwelveDataRateLimiterService();

    for (let i = 0; i < 8; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('refills to full capacity', () => {
    const limiter = new TwelveDataRateLimiterService();
    for (let i = 0; i < 8; i++) {
      limiter.tryAcquire();
    }
    expect(limiter.tryAcquire()).toBe(false);

    limiter.refill();

    for (let i = 0; i < 8; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }
    expect(limiter.tryAcquire()).toBe(false);
  });
});
