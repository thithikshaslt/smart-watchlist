export type FreshnessStatus = 'current' | 'delayed' | 'stale';

// Exported so ingestion can skip refetching a quote that's already fresh
// enough, rather than only using this threshold to label age after the
// fact - a single definition of "fresh enough" either way.
export const CURRENT_THRESHOLD_MS = 10 * 60 * 1000;
const DELAYED_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export function computeFreshness(
  ingestedAt: Date,
  now: Date = new Date(),
): FreshnessStatus {
  const ageMs = now.getTime() - ingestedAt.getTime();
  if (ageMs <= CURRENT_THRESHOLD_MS) {
    return 'current';
  }
  if (ageMs <= DELAYED_THRESHOLD_MS) {
    return 'delayed';
  }
  return 'stale';
}
