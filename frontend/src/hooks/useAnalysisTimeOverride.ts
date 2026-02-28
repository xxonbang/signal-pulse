import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHistoryIndex } from './useHistoryIndex';
import { useKISHistoryIndex } from './useKISHistoryIndex';
import { useCombinedHistoryIndex } from './useCombinedData';
import {
  fetchHistoryData,
  fetchKISHistoryData,
  fetchCombinedHistoryData,
} from '@/services/api';
import { useSimulationStore } from '@/store/simulationStore';
import type {
  SimulationData,
  SimulationStock,
  SimulationCategory,
  HistoryIndex,
} from '@/services/types';

export interface AvailableTime {
  time: string;
  label: string;
  isEarliest: boolean;
}

interface UseAnalysisTimeOverrideResult {
  availableTimes: AvailableTime[];
  selectedTime: string | null;
  overriddenData: SimulationData | null;
  isLoading: boolean;
}

function formatTimeLabel(time: string): string {
  return `${time.slice(0, 2)}:${time.slice(2)}`;
}

function collectTimes(index: HistoryIndex | null | undefined, date: string): string[] {
  if (!index) return [];
  return index.history
    .filter((h) => h.date === date && h.time)
    .map((h) => h.time!);
}

function findFilename(
  index: HistoryIndex | null | undefined,
  date: string,
  time: string,
): string | null {
  if (!index) return null;
  const item = index.history.find((h) => h.date === date && h.time === time);
  return item?.filename || null;
}

export function useAnalysisTimeOverride(
  date: string | null,
  simulationData: SimulationData | null,
): UseAnalysisTimeOverrideResult {
  // 1. 3개 히스토리 인덱스 재활용 (staleTime 5분, 캐시 공유)
  const { data: visionIndex } = useHistoryIndex();
  const { data: kisIndex } = useKISHistoryIndex();
  const { data: combinedIndex } = useCombinedHistoryIndex();

  // 2. 해당 날짜의 사용 가능한 시간대 추출
  const availableTimes = useMemo<AvailableTime[]>(() => {
    if (!date) return [];

    const timeSet = new Set<string>();
    collectTimes(visionIndex, date).forEach((t) => timeSet.add(t));
    collectTimes(kisIndex, date).forEach((t) => timeSet.add(t));
    collectTimes(combinedIndex, date).forEach((t) => timeSet.add(t));

    const sorted = [...timeSet].sort();
    return sorted.map((time, i) => ({
      time,
      label: formatTimeLabel(time),
      isEarliest: i === 0,
    }));
  }, [date, visionIndex, kisIndex, combinedIndex]);

  // 3. store에서 선택된 시간 읽기
  const { analysisTimeOverrides } = useSimulationStore();
  const selectedTime = date ? analysisTimeOverrides[date] ?? null : null;

  // 4. 오버라이드 필요 여부 판단
  const earliestTime = availableTimes.length > 0 ? availableTimes[0].time : null;
  const needsOverride = !!(
    selectedTime &&
    earliestTime &&
    selectedTime !== earliestTime
  );

  // 5. 선택된 시간대의 히스토리 파일명 찾기
  const filenames = useMemo(() => {
    if (!date || !needsOverride || !selectedTime) {
      return { vision: null, kis: null, combined: null };
    }
    return {
      vision: findFilename(visionIndex, date, selectedTime),
      kis: findFilename(kisIndex, date, selectedTime),
      combined: findFilename(combinedIndex, date, selectedTime),
    };
  }, [date, needsOverride, selectedTime, visionIndex, kisIndex, combinedIndex]);

  // 6. 히스토리 데이터 fetch (조건부)
  const { data: visionData, isLoading: visionLoading } = useQuery({
    queryKey: ['history', filenames.vision],
    queryFn: () => fetchHistoryData(filenames.vision!),
    enabled: !!filenames.vision,
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

  const { data: kisData, isLoading: kisLoading } = useQuery({
    queryKey: ['kis-history', filenames.kis],
    queryFn: () => fetchKISHistoryData(filenames.kis!),
    enabled: !!filenames.kis,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const { data: combinedData, isLoading: combinedLoading } = useQuery({
    queryKey: ['combined-history', filenames.combined],
    queryFn: () => fetchCombinedHistoryData(filenames.combined!),
    enabled: !!filenames.combined,
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

  const isLoading =
    needsOverride &&
    ((!!filenames.vision && visionLoading) ||
      (!!filenames.kis && kisLoading) ||
      (!!filenames.combined && combinedLoading));

  // 7. 오버라이드 SimulationData 빌드
  const overriddenData = useMemo<SimulationData | null>(() => {
    if (!needsOverride || !simulationData || isLoading) return null;

    // code → 가격 맵 구축 (all_prices 우선, 카테고리 데이터 보충)
    const priceMap = new Map<
      string,
      {
        open: number | null;
        close: number | null;
        high: number | null;
        high_price_time: string | null;
        return_pct: number | null;
        high_return_pct: number | null;
      }
    >();

    // 1) all_prices에서 먼저 로드 (모든 시간대 유니온 가격)
    if (simulationData.all_prices) {
      for (const [code, p] of Object.entries(simulationData.all_prices)) {
        const open = p.open_price;
        const close = p.close_price;
        const high = p.high_price;
        priceMap.set(code, {
          open,
          close,
          high,
          high_price_time: p.high_price_time ?? null,
          return_pct: open && close && open > 0
            ? Math.round((close - open) / open * 10000) / 100
            : null,
          high_return_pct: open && high && open > 0
            ? Math.round((high - open) / open * 10000) / 100
            : null,
        });
      }
    }

    // 2) 카테고리 데이터로 보충 (이미 계산된 return_pct 활용)
    for (const cat of ['vision', 'kis', 'combined'] as SimulationCategory[]) {
      for (const stock of simulationData.categories[cat] || []) {
        if (!priceMap.has(stock.code)) {
          priceMap.set(stock.code, {
            open: stock.open_price,
            close: stock.close_price,
            high: stock.high_price,
            high_price_time: stock.high_price_time ?? null,
            return_pct: stock.return_pct,
            high_return_pct: stock.high_return_pct,
          });
        }
      }
    }

    // 각 카테고리별 적극매수 종목 추출 + 가격 매칭
    const buildStocks = (category: SimulationCategory): SimulationStock[] => {
      let stockInfos: { code: string; name: string; market: string }[] = [];

      if (category === 'vision' && visionData) {
        stockInfos = visionData.results
          .filter((r) => r.signal === '적극매수')
          .map((r) => ({ code: r.code, name: r.name, market: r.market || '' }));
      } else if (category === 'kis' && kisData) {
        stockInfos = kisData.results
          .filter((r) => r.signal === '적극매수')
          .map((r) => ({ code: r.code, name: r.name, market: r.market }));
      } else if (category === 'combined' && combinedData) {
        stockInfos = combinedData.stocks
          .filter(
            (s) =>
              s.match_status === 'match' && s.vision_signal === '적극매수',
          )
          .map((s) => ({ code: s.code, name: s.name, market: s.market }));
      }

      return stockInfos.map(({ code, name, market }) => {
        const prices = priceMap.get(code);
        if (prices) {
          return {
            code,
            name,
            market,
            open_price: prices.open,
            close_price: prices.close,
            high_price: prices.high,
            high_price_time: prices.high_price_time,
            return_pct: prices.return_pct,
            high_return_pct: prices.high_return_pct,
          };
        }
        // 가격 미수집 종목
        return {
          code,
          name: `${name} (가격 미수집)`,
          market,
          open_price: null,
          close_price: null,
          high_price: null,
          high_price_time: null,
          return_pct: null,
          high_return_pct: null,
        };
      });
    };

    return {
      date: simulationData.date,
      collected_at: simulationData.collected_at,
      categories: {
        vision: buildStocks('vision'),
        kis: buildStocks('kis'),
        combined: buildStocks('combined'),
      },
    };
  }, [needsOverride, simulationData, isLoading, visionData, kisData, combinedData]);

  return {
    availableTimes,
    selectedTime,
    overriddenData,
    isLoading,
  };
}
