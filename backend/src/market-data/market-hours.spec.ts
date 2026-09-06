import { isMarketClosed } from './market-hours';

describe('isMarketClosed', () => {
  it('treats Saturday as closed', () => {
    expect(isMarketClosed(new Date('2026-01-03T12:00:00Z'))).toBe(true);
  });

  it('treats Sunday as closed', () => {
    expect(isMarketClosed(new Date('2026-01-04T12:00:00Z'))).toBe(true);
  });

  it('treats a weekday as open', () => {
    expect(isMarketClosed(new Date('2026-01-01T12:00:00Z'))).toBe(false);
  });
});
