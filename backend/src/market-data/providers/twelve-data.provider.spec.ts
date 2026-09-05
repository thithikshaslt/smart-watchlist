import { ConfigService } from '@nestjs/config';
import { TwelveDataProvider } from './twelve-data.provider';

describe('TwelveDataProvider', () => {
  let provider: TwelveDataProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'TWELVE_DATA_BASE_URL'
          ? 'https://api.twelvedata.com'
          : 'test-api-key',
      ),
    } as unknown as ConfigService;
    provider = new TwelveDataProvider(configService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('getQuote', () => {
    it('normalizes a successful response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            close: '150.25',
            change: '1.5',
            percent_change: '1.01',
            timestamp: 1700000000,
          }),
      });

      const quote = await provider.getQuote('AAPL');

      expect(quote).toEqual({
        price: 150.25,
        change: 1.5,
        changePercent: 1.01,
        providerTimestamp: new Date(1700000000 * 1000),
      });
    });

    it('throws when the provider responds with an error status', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'error',
            code: 429,
            message: 'rate limit exceeded',
          }),
      });

      await expect(provider.getQuote('AAPL')).rejects.toThrow(
        /rate limit exceeded/,
      );
    });

    it('throws when the HTTP request itself fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'bad request' }),
      });

      await expect(provider.getQuote('AAPL')).rejects.toThrow();
    });

    it('bounds the request with a timeout signal, so a hung request cannot block ingestion forever', async () => {
      // Stub out the real timer AbortSignal.timeout() would otherwise start -
      // the assertion only cares that a signal was passed, not that it's a
      // real 10s timer left dangling past this (mocked, instant) test.
      const timeoutSpy = jest
        .spyOn(AbortSignal, 'timeout')
        .mockReturnValue(new AbortController().signal);
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ close: '1' }),
      });

      await provider.getQuote('AAPL');

      const [, options] = fetchMock.mock.calls[0];
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(timeoutSpy).toHaveBeenCalledWith(10_000);

      timeoutSpy.mockRestore();
    });
  });

  describe('getCandles', () => {
    it('normalizes candle values', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            values: [
              {
                datetime: '2026-01-01',
                open: '10',
                high: '12',
                low: '9',
                close: '11',
                volume: '1000',
              },
            ],
          }),
      });

      const candles = await provider.getCandles('AAPL', 'daily', 1);

      expect(candles).toEqual([
        {
          timestamp: new Date('2026-01-01'),
          open: 10,
          high: 12,
          low: 9,
          close: 11,
          volume: 1000,
        },
      ]);
    });
  });
});
