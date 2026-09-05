import { useEffect, useRef } from 'react'
import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle } from './useHistory'

interface PriceChartProps {
  candles: Candle[]
}

// A simple filled line chart of the closing price, rather than an OHLC
// candlestick chart - more immediately readable as "the price over time" for
// a beginner-first default (docs/product.md: "Simple by default"), and
// candlesticks read as a denser, more expert-oriented view.
function PriceChart({ candles }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart: IChartApi = createChart(container, {
      height: 300,
      autoSize: true,
    })
    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, 0.4)',
      bottomColor: 'rgba(37, 99, 235, 0.02)',
      lineWidth: 2,
    })

    return () => {
      chart.remove()
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    seriesRef.current?.setData(
      candles.map((candle) => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as UTCTimestamp,
        value: candle.close,
      })),
    )
  }, [candles])

  return <div ref={containerRef} data-testid="price-chart" />
}

export default PriceChart
