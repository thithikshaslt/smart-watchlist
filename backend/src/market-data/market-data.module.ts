import { Module } from '@nestjs/common';
import { CandleIngestionService } from './ingestion/candle-ingestion.service';
import { QuoteIngestionService } from './ingestion/quote-ingestion.service';
import { MARKET_DATA_PROVIDER } from './market-data-provider.interface';
import { MarketDataService } from './market-data.service';
import { TwelveDataProvider } from './providers/twelve-data.provider';
import { TwelveDataRateLimiterService } from './twelve-data-rate-limiter.service';
import { WatchlistedInstrumentsService } from './watchlisted-instruments.service';

@Module({
  providers: [
    MarketDataService,
    WatchlistedInstrumentsService,
    TwelveDataRateLimiterService,
    QuoteIngestionService,
    CandleIngestionService,
    { provide: MARKET_DATA_PROVIDER, useClass: TwelveDataProvider },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
