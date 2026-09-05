export const MARKET_DATA_PROVIDER = Symbol('MARKET_DATA_PROVIDER');

export type CandleIntervalKey = 'intraday_5m' | 'daily';

export interface ProviderQuote {
  price: number;
  change: number;
  changePercent: number;
  providerTimestamp: Date;
}

export interface ProviderCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  getQuote(providerSymbol: string): Promise<ProviderQuote>;
  getCandles(
    providerSymbol: string,
    interval: CandleIntervalKey,
    outputSize: number,
  ): Promise<ProviderCandle[]>;
}
