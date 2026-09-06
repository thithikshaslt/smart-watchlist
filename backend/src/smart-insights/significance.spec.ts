import {
  classifyInstrumentMove,
  computeAtrPercent,
  scaleBaseline,
} from './significance';

const DAY_MS = 24 * 60 * 60 * 1000;

// 20 identical flat bars: high 101 / low 99 / close 100. True range is 2 for
// every bar (both the initial high-low bar and every |high/low - prevClose|
// comparison against the same 100 close), so ATR = 2 and ATR% = 2% exactly.
const flatBars = (count: number) =>
  Array.from({ length: count }, () => ({ high: 101, low: 99, close: 100 }));

describe('computeAtrPercent', () => {
  it('computes the 20-day ATR as a percentage of the latest close', () => {
    expect(computeAtrPercent(flatBars(20))).toBeCloseTo(2, 10);
  });

  it('uses only the most recent 20 bars when given more', () => {
    expect(computeAtrPercent(flatBars(30))).toBeCloseTo(2, 10);
  });

  it('returns null when fewer than 20 daily bars are available', () => {
    expect(computeAtrPercent(flatBars(19))).toBeNull();
    expect(computeAtrPercent([])).toBeNull();
  });
});

describe('scaleBaseline', () => {
  it('leaves the baseline unchanged over exactly one day', () => {
    expect(scaleBaseline(2, DAY_MS)).toBeCloseTo(2, 10);
  });

  it('scales by the square root of elapsed days for a multi-day gap', () => {
    expect(scaleBaseline(2, 4 * DAY_MS)).toBeCloseTo(4, 10); // 2 * sqrt(4)
  });

  it('shrinks the baseline for a sub-day gap', () => {
    expect(scaleBaseline(2, DAY_MS / 4)).toBeCloseTo(1, 10); // 2 * sqrt(0.25)
  });
});

describe('classifyInstrumentMove', () => {
  const baseInput = {
    dailyCandles: flatBars(20), // ATR% = 2, scaled baseline over 1 day = 2
    elapsedMs: DAY_MS,
  };

  it('classifies a move under 1.5x the baseline as normal', () => {
    const result = classifyInstrumentMove({
      ...baseInput,
      currentPrice: 101,
      priorPrice: 100, // +1%, threshold is 3%
      benchmarkCurrentPrice: 100,
      benchmarkPriorPrice: 100,
    });
    expect(result).toBe('normal');
  });

  it('classifies an outsized move matched by the benchmark as broad-market', () => {
    const result = classifyInstrumentMove({
      ...baseInput,
      currentPrice: 105,
      priorPrice: 100, // +5%, past the 3% threshold
      benchmarkCurrentPrice: 105,
      benchmarkPriorPrice: 100, // benchmark also +5% - divergence 0
    });
    expect(result).toBe('broad-market');
  });

  it('classifies an outsized move not explained by the benchmark as notable', () => {
    const result = classifyInstrumentMove({
      ...baseInput,
      currentPrice: 105,
      priorPrice: 100, // +5%
      benchmarkCurrentPrice: 100,
      benchmarkPriorPrice: 100, // benchmark flat - divergence 5 > baseline 2
    });
    expect(result).toBe('notable');
  });

  it('returns insufficient-history when the instrument lacks 20 daily bars', () => {
    const result = classifyInstrumentMove({
      dailyCandles: flatBars(5),
      elapsedMs: DAY_MS,
      currentPrice: 200,
      priorPrice: 100,
      benchmarkCurrentPrice: 100,
      benchmarkPriorPrice: 100,
    });
    expect(result).toBe('insufficient-history');
  });
});
