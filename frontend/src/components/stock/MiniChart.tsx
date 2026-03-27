import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi, type CandlestickData, type Time } from 'lightweight-charts';

interface MiniChartProps {
  /** OHLCV 데이터 (날짜 오름차순) */
  data: { date: string; open: number; high: number; low: number; close: number }[];
  height?: number;
}

// 한국 주식 상승=빨강, 하락=파랑 (토큰 색상 참조)
const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#3b82f6';

export function MiniChart({ data, height = 120 }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 280;

    const chart = createChart(containerRef.current, {
      width: containerWidth,
      height,
      layout: { background: { color: 'transparent' }, textColor: '#999' },
      grid: { vertLines: { visible: false }, horzLines: { color: '#f0f0f0' } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    });

    const candleData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    series.setData(candleData);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    // 컨테이너 리사이즈 대응
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  if (data.length === 0) return null;

  return <div ref={containerRef} className="w-full" />;
}
