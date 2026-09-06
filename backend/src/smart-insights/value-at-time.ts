// Reusable "value as of a point in time" lookup over an ascending time
// series (design.md - "value at the previous watermark"). Pure array search
// so it's testable without a database.

export interface Timestamped {
  timestamp: Date;
}

/**
 * Returns the last entry at or before `target` from `ascendingSeries`
 * (oldest first). Returns null if every entry is after `target`.
 */
export function findClosestAtOrBefore<T extends Timestamped>(
  ascendingSeries: T[],
  target: Date,
): T | null {
  let result: T | null = null;
  for (const entry of ascendingSeries) {
    if (entry.timestamp.getTime() > target.getTime()) {
      break;
    }
    result = entry;
  }
  return result;
}
