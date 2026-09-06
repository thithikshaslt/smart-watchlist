// Fixed catalog a watchlist's display lens can select from (proposal.md -
// "a small fixed catalog, not a general column builder"). Deliberately not
// user-extensible.
export const VIEW_LENS_METRICS = [
  'price',
  'dollarChange',
  'percentChange',
  'dayRange',
  'volume',
  'freshness',
] as const;

export type ViewLensMetric = (typeof VIEW_LENS_METRICS)[number];
