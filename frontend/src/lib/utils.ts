import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { SignalCounts, StockResult, SignalType } from '@/services/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function categorizeStocks(results: StockResult[]) {
  const kospi = results.slice(0, 50);
  const kosdaq = results.slice(50, 120);
  return { kospi, kosdaq };
}

export function getSignalCounts(results: StockResult[], market: 'all' | 'kospi' | 'kosdaq' = 'all'): SignalCounts {
  const { kospi, kosdaq } = categorizeStocks(results);
  const filtered = market === 'kospi' ? kospi : market === 'kosdaq' ? kosdaq : results;

  const counts: SignalCounts = {
    '적극매수': 0,
    '매수': 0,
    '중립': 0,
    '매도': 0,
    '적극매도': 0,
  };

  filtered.forEach(r => {
    if (r.signal in counts) {
      counts[r.signal]++;
    }
  });

  return counts;
}

export function getFilteredStocks(
  results: StockResult[],
  market: 'all' | 'kospi' | 'kosdaq',
  signal: SignalType | null
): StockResult[] {
  const { kospi, kosdaq } = categorizeStocks(results);
  let filtered = market === 'kospi' ? kospi : market === 'kosdaq' ? kosdaq : results;

  if (signal) {
    // Strict filtering: only include stocks that exactly match the signal
    filtered = filtered.filter(r => {
      const stockSignal = r.signal?.trim();
      const filterSignal = signal.trim();
      return stockSignal === filterSignal;
    });
  }

  return filtered;
}

export function getLatestAnalysisTime(results: StockResult[]): string | null {
  const times = results
    .map(r => r.analysis_time)
    .filter((t): t is string => t !== undefined && t !== 'N/A')
    .sort()
    .reverse();
  return times.length > 0 ? times[0] : null;
}

export function formatTimeOnly(datetime: string | undefined): string {
  if (!datetime) return '';
  const parts = datetime.split(' ');
  return parts[1] || datetime;
}
