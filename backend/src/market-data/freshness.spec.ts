import { computeFreshness } from './freshness';

describe('computeFreshness', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('is current within the last 10 minutes', () => {
    const ingestedAt = new Date(now.getTime() - 5 * 60 * 1000);
    expect(computeFreshness(ingestedAt, now)).toBe('current');
  });

  it('is current exactly at the 10 minute boundary', () => {
    const ingestedAt = new Date(now.getTime() - 10 * 60 * 1000);
    expect(computeFreshness(ingestedAt, now)).toBe('current');
  });

  it('is delayed between 10 minutes and 2 hours', () => {
    const ingestedAt = new Date(now.getTime() - 30 * 60 * 1000);
    expect(computeFreshness(ingestedAt, now)).toBe('delayed');
  });

  it('is stale beyond 2 hours', () => {
    const ingestedAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(computeFreshness(ingestedAt, now)).toBe('stale');
  });
});
