// One-off dev/demo utility: backfills synthetic daily OHLCV history so the
// smart-insights significance engine (which needs 20 real daily candles per
// instrument) can actually be demonstrated without waiting ~20 real trading
// days. NOT part of the app - run manually, never imported by app code.
const { PrismaClient, CandleInterval } = require('@prisma/client');

const prisma = new PrismaClient();

// Calibrated empirically against the real ATR calculation (the generated
// OHLC spread inflates realized ATR to roughly 3x the nominal figure here -
// these are pre-divided so the *measured* ATR% lands close to the intended
// real-world values, e.g. AMD really is much more volatile day-to-day than WMT).
const DAILY_VOLATILITY = {
  default: 0.00375,
  SPY: 0.0022,
  AMD: 0.00875,
  WMT: 0.0028,
};

// The move from the backfilled anchor day to today's live price, engineered
// (not left to pure chance) so the demo actually shows all three outcomes:
// AAPL stays inside its own normal range; WMT moves about as much as SPY
// (broad-market); AMD moves far more than both its own range and SPY's move
// (notable). Anything not listed gets a small, boring +0.5% (normal).
const TARGET_MOVE_PERCENT = {
  SPY: 3.0,
  WMT: 3.2,
  AAPL: 0.5,
  AMD: 12.0,
};
const DEFAULT_TARGET_MOVE_PERCENT = 0.5;

function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function weekdaysEndingAt(endDate, count) {
  const dates = [];
  // Floor to UTC midnight - otherwise re-running this script bakes in a
  // different time-of-day each time, so the same calendar date's upsert
  // never matches the (instrumentId, interval, timestamp) unique key from a
  // prior run and silently piles up duplicate, conflicting price paths.
  const cursor = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}

async function main() {
  const items = await prisma.watchlistItem.findMany({
    distinct: ['instrumentId'],
    include: { instrument: true },
  });
  const spy = await prisma.instrument.findFirst({ where: { symbol: 'SPY' } });
  const byId = new Map(
    [...items.map((i) => i.instrument), spy].filter(Boolean).map((i) => [i.id, i]),
  );
  const instruments = [...byId.values()];

  const now = new Date();
  const backfillEnd = new Date(now);
  backfillEnd.setUTCDate(backfillEnd.getUTCDate() - 4);
  const dates = weekdaysEndingAt(backfillEnd, 26);

  for (const inst of instruments) {
    const quote = await prisma.latestQuote.findUnique({
      where: { instrumentId: inst.id },
    });
    const livePrice = quote ? Number(quote.price) : 100;
    const vol = DAILY_VOLATILITY[inst.symbol] ?? DAILY_VOLATILITY.default;
    const targetMovePercent =
      TARGET_MOVE_PERCENT[inst.symbol] ?? DEFAULT_TARGET_MOVE_PERCENT;

    // The last (most recent) backfilled day is the one actually compared
    // against today's live price - set it directly to the engineered target
    // move, then walk backward from there with normal daily noise so the
    // ATR baseline still reflects plausible day-to-day variability.
    let price = livePrice / (1 + targetMovePercent / 100);
    const closes = new Array(dates.length);
    for (let i = dates.length - 1; i >= 0; i -= 1) {
      closes[i] = price;
      price = price / (1 + randNormal() * vol);
    }

    for (let i = 0; i < dates.length; i += 1) {
      const close = closes[i];
      const prevClose = i > 0 ? closes[i - 1] : close;
      const open = prevClose * (1 + randNormal() * vol * 0.3);
      const spread = Math.abs(randNormal()) * vol * close + vol * close * 0.3;
      const high = Math.max(open, close) + spread * 0.5;
      const low = Math.min(open, close) - spread * 0.5;
      const volume = BigInt(Math.round(1_000_000 + Math.random() * 5_000_000));

      await prisma.ohlcvCandle.upsert({
        where: {
          instrumentId_interval_timestamp: {
            instrumentId: inst.id,
            interval: CandleInterval.daily,
            timestamp: dates[i],
          },
        },
        create: {
          instrumentId: inst.id,
          interval: CandleInterval.daily,
          timestamp: dates[i],
          open,
          high,
          low,
          close,
          volume,
        },
        update: { open, high, low, close, volume },
      });
    }
    console.log(
      `${inst.symbol}: backfilled ${dates.length} daily candles, anchor day close ${closes[closes.length - 1].toFixed(2)} vs live ${livePrice.toFixed(2)} (target move ${targetMovePercent > 0 ? '+' : ''}${targetMovePercent}%)`,
    );
  }

  // Rewind lastViewedAt on every non-empty watchlist to the backfill window,
  // so the next real visit compares against this history via the daily-candle
  // path (same-day visits instead use intraday candles, which don't exist for
  // today - a closed-market Saturday).
  const watchlists = await prisma.watchlist.findMany({
    where: { items: { some: {} } },
  });
  for (const watchlist of watchlists) {
    await prisma.watchlist.update({
      where: { id: watchlist.id },
      data: { lastViewedAt: backfillEnd },
    });
  }
  console.log(
    `Rewound lastViewedAt to ${backfillEnd.toISOString()} on ${watchlists.length} watchlist(s) - next visit to each will classify against this backfilled history.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
