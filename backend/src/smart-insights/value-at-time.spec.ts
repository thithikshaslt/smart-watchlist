import { findClosestAtOrBefore } from './value-at-time';

describe('findClosestAtOrBefore', () => {
  const series = [
    { timestamp: new Date('2026-01-01T00:00:00Z'), value: 1 },
    { timestamp: new Date('2026-01-02T00:00:00Z'), value: 2 },
    { timestamp: new Date('2026-01-03T00:00:00Z'), value: 3 },
  ];

  it('returns the entry exactly at the target timestamp', () => {
    const result = findClosestAtOrBefore(
      series,
      new Date('2026-01-02T00:00:00Z'),
    );
    expect(result?.value).toBe(2);
  });

  it('returns the nearest entry before the target when there is no exact match', () => {
    const result = findClosestAtOrBefore(
      series,
      new Date('2026-01-02T12:00:00Z'),
    );
    expect(result?.value).toBe(2);
  });

  it('returns the latest entry when the target is after all of them', () => {
    const result = findClosestAtOrBefore(
      series,
      new Date('2026-06-01T00:00:00Z'),
    );
    expect(result?.value).toBe(3);
  });

  it('returns null when the target is before every entry', () => {
    const result = findClosestAtOrBefore(
      series,
      new Date('2025-01-01T00:00:00Z'),
    );
    expect(result).toBeNull();
  });

  it('returns null for an empty series', () => {
    expect(findClosestAtOrBefore([], new Date())).toBeNull();
  });
});
