// Read-only diagnostic: replays WatchlistVisitsService's exact classification
// logic against real DB state, without needing the owning user's credentials
// (auth would otherwise block inspecting someone else's watchlist directly).
import { CandleInterval, PrismaClient } from '@prisma/client';
import { BENCHMARK_SYMBOLS } from '../src/market-data/benchmark-instruments';
import {
  classifyInstrumentMove,
  computeAtrPercent,
  scaleBaseline,
} from '../src/smart-insights/significance';
import { findClosestAtOrBefore } from '../src/smart-insights/value-at-time';

const prisma = new PrismaClient();

async function getAscendingDailyCandles(instrumentId: string) {
  const rows = await prisma.ohlcvCandle.findMany({
    where: { instrumentId, interval: CandleInterval.daily },
    orderBy: { timestamp: 'desc' },
    take: 40,
  });
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      timestamp: row.timestamp,
    }));
}

async function main() {
  const watchlistName = process.argv[2] ?? 'random';
  const watchlist = await prisma.watchlist.findFirst({
    where: { name: watchlistName },
    include: { items: { include: { instrument: true } } },
  });
  if (!watchlist || !watchlist.lastViewedAt) {
    console.log('Watchlist not found or has no previous visit recorded.');
    return;
  }

  const previousViewedAt = watchlist.lastViewedAt;
  const now = new Date();
  console.log(
    `Watchlist "${watchlist.name}": previousViewedAt=${previousViewedAt.toISOString()}, now=${now.toISOString()}`,
  );

  const benchmark = await prisma.instrument.findFirst({
    where: { symbol: { in: BENCHMARK_SYMBOLS } },
  });
  if (!benchmark) {
    console.log('No benchmark instrument found.');
    return;
  }
  const benchmarkQuote = await prisma.latestQuote.findUnique({
    where: { instrumentId: benchmark.id },
  });
  const benchmarkDaily = await getAscendingDailyCandles(benchmark.id);
  const benchmarkPrior = findClosestAtOrBefore(benchmarkDaily, previousViewedAt);
  console.log(
    `Benchmark ${benchmark.symbol}: current=${benchmarkQuote ? Number(benchmarkQuote.price) : 'none'}, prior=${benchmarkPrior?.close}`,
  );

  for (const item of watchlist.items) {
    const inst = item.instrument;
    const quote = await prisma.latestQuote.findUnique({
      where: { instrumentId: inst.id },
    });
    const daily = await getAscendingDailyCandles(inst.id);
    const prior = findClosestAtOrBefore(daily, previousViewedAt);

    if (!quote || !benchmarkQuote || !prior || !benchmarkPrior) {
      console.log(`${inst.symbol}: classification=null (missing data)`);
      continue;
    }

    const classification = classifyInstrumentMove({
      dailyCandles: daily,
      currentPrice: Number(quote.price),
      priorPrice: prior.close,
      benchmarkCurrentPrice: Number(benchmarkQuote.price),
      benchmarkPriorPrice: benchmarkPrior.close,
      elapsedMs: now.getTime() - previousViewedAt.getTime(),
    });

    const movePct = ((Number(quote.price) - prior.close) / prior.close) * 100;
    const atrPercent = computeAtrPercent(daily);
    const scaled =
      atrPercent === null
        ? null
        : scaleBaseline(atrPercent, now.getTime() - previousViewedAt.getTime());
    console.log(
      `${inst.symbol}: move=${movePct.toFixed(2)}% (${prior.close.toFixed(2)} -> ${Number(quote.price).toFixed(2)}), atr%=${atrPercent?.toFixed(2)}, scaledBaseline=${scaled?.toFixed(2)}, threshold=${scaled ? (scaled * 1.5).toFixed(2) : 'n/a'}, classification=${classification}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
