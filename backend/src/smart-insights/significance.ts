// Deterministic move-significance classification (design.md - "Significance
// math"). No AI/ML, no user-tunable thresholds - plain arithmetic over daily
// OHLCV history already collected by market-data ingestion.

export type MoveClassification =
  'normal' | 'broad-market' | 'notable' | 'insufficient-history';

export interface DailyBar {
  high: number;
  low: number;
  close: number;
}

const ATR_WINDOW = 20;
const NOTABLE_MULTIPLIER = 1.5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 20-day Average True Range, expressed as a percentage of the most recent
 * close. `dailyCandles` must be ascending (oldest first); only the most
 * recent 20 are used. Returns null when fewer than 20 are available - there
 * isn't yet a reliable "typical range" to compare against.
 */
export function computeAtrPercent(dailyCandles: DailyBar[]): number | null {
  if (dailyCandles.length < ATR_WINDOW) {
    return null;
  }

  const window = dailyCandles.slice(-ATR_WINDOW);
  const trueRanges = window.map((bar, index) => {
    const range = bar.high - bar.low;
    if (index === 0) {
      return range;
    }
    const prevClose = window[index - 1].close;
    return Math.max(
      range,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose),
    );
  });

  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  const latestClose = window[window.length - 1].close;
  return (atr / latestClose) * 100;
}

/**
 * Scales a daily ATR% baseline to the expected move magnitude over a longer
 * (or shorter) elapsed window. Price dispersion grows with the square root
 * of elapsed time, not linearly - without this, any visit gap longer than a
 * day would make ordinary drift look "notable" purely for having accumulated
 * over more days.
 */
export function scaleBaseline(atrPercent: number, elapsedMs: number): number {
  const elapsedDays = Math.max(elapsedMs, 0) / DAY_MS;
  return atrPercent * Math.sqrt(elapsedDays);
}

function classifyMove(
  movePercent: number,
  benchmarkMovePercent: number,
  scaledBaselinePercent: number,
): 'normal' | 'broad-market' | 'notable' {
  const threshold = NOTABLE_MULTIPLIER * scaledBaselinePercent;
  if (Math.abs(movePercent) < threshold) {
    return 'normal';
  }

  const divergenceFromBenchmark = Math.abs(movePercent - benchmarkMovePercent);
  if (divergenceFromBenchmark <= scaledBaselinePercent) {
    return 'broad-market';
  }
  return 'notable';
}

export interface ClassifyInstrumentMoveInput {
  dailyCandles: DailyBar[];
  currentPrice: number;
  priorPrice: number;
  benchmarkCurrentPrice: number;
  benchmarkPriorPrice: number;
  elapsedMs: number;
}

export function classifyInstrumentMove({
  dailyCandles,
  currentPrice,
  priorPrice,
  benchmarkCurrentPrice,
  benchmarkPriorPrice,
  elapsedMs,
}: ClassifyInstrumentMoveInput): MoveClassification {
  const atrPercent = computeAtrPercent(dailyCandles);
  if (atrPercent === null) {
    return 'insufficient-history';
  }

  const scaledBaseline = scaleBaseline(atrPercent, elapsedMs);
  const movePercent = ((currentPrice - priorPrice) / priorPrice) * 100;
  const benchmarkMovePercent =
    ((benchmarkCurrentPrice - benchmarkPriorPrice) / benchmarkPriorPrice) * 100;

  return classifyMove(movePercent, benchmarkMovePercent, scaledBaseline);
}
