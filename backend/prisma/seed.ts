import { PrismaClient } from '@prisma/client';
import fixtures from './fixtures/instruments.json';

const prisma = new PrismaClient();

interface InstrumentFixture {
  symbol: string;
  name: string;
  exchange: string;
}

async function main() {
  const instruments = fixtures as InstrumentFixture[];

  for (const instrument of instruments) {
    await prisma.instrument.upsert({
      where: {
        symbol_exchange: {
          symbol: instrument.symbol,
          exchange: instrument.exchange,
        },
      },
      // Twelve Data uses the plain ticker as its symbol for these US-listed equities.
      create: { ...instrument, providerSymbol: instrument.symbol },
      update: { name: instrument.name, providerSymbol: instrument.symbol },
    });
  }

  console.log(`Seeded ${instruments.length} instruments.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
