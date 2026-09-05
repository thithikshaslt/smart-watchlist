import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CandleIntervalKey,
  MarketDataProvider,
  ProviderCandle,
  ProviderQuote,
} from '../market-data-provider.interface';

interface TwelveDataErrorBody {
  status: 'error';
  code?: number;
  message?: string;
}

interface TwelveDataQuoteBody {
  status?: 'error';
  close?: string;
  change?: string;
  percent_change?: string;
  timestamp?: number;
}

interface TwelveDataCandleValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TwelveDataTimeSeriesBody {
  status?: 'error';
  code?: number;
  message?: string;
  values?: TwelveDataCandleValue[];
}

const INTERVAL_MAP: Record<CandleIntervalKey, string> = {
  intraday_5m: '5min',
  daily: '1day',
};

// Without a bound, a single hung request would stall this instrument's slot
// forever - and since QuoteIngestionService processes the stalest instrument
// first every tick, a permanently-hanging request for one instrument would
// starve every other watchlisted instrument behind it in the queue too.
const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class TwelveDataProvider implements MarketDataProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('TWELVE_DATA_BASE_URL');
    this.apiKey = configService.getOrThrow<string>('TWELVE_DATA_API_KEY');
  }

  async getQuote(providerSymbol: string): Promise<ProviderQuote> {
    const url = new URL('/quote', this.baseUrl);
    url.searchParams.set('symbol', providerSymbol);
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await response.json()) as TwelveDataQuoteBody &
      TwelveDataErrorBody;
    this.assertOk(response.ok, body);

    if (body.close === undefined) {
      throw new Error(
        `Twelve Data quote response missing 'close' for ${providerSymbol}`,
      );
    }

    return {
      price: Number(body.close),
      change: Number(body.change ?? 0),
      changePercent: Number(body.percent_change ?? 0),
      providerTimestamp: body.timestamp
        ? new Date(body.timestamp * 1000)
        : new Date(),
    };
  }

  async getCandles(
    providerSymbol: string,
    interval: CandleIntervalKey,
    outputSize: number,
  ): Promise<ProviderCandle[]> {
    const url = new URL('/time_series', this.baseUrl);
    url.searchParams.set('symbol', providerSymbol);
    url.searchParams.set('interval', INTERVAL_MAP[interval]);
    url.searchParams.set('outputsize', String(outputSize));
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await response.json()) as TwelveDataTimeSeriesBody &
      TwelveDataErrorBody;
    this.assertOk(response.ok, body);

    return (body.values ?? []).map((value) => ({
      timestamp: new Date(value.datetime),
      open: Number(value.open),
      high: Number(value.high),
      low: Number(value.low),
      close: Number(value.close),
      volume: Number(value.volume),
    }));
  }

  private assertOk(
    httpOk: boolean,
    body: { status?: 'error'; message?: string; code?: number },
  ): void {
    if (!httpOk || body.status === 'error') {
      throw new Error(
        `Twelve Data request failed${body.code ? ` (code ${body.code})` : ''}: ${body.message ?? 'unknown error'}`,
      );
    }
  }
}
