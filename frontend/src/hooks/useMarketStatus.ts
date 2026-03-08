import { useQuery } from '@tanstack/react-query';
import { fetchMarketStatus, fetchFearGreedIndex, fetchVixData } from '@/services/api';

export function useMarketStatus() {
  return useQuery({
    queryKey: ['market-status'],
    queryFn: fetchMarketStatus,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useFearGreedIndex() {
  return useQuery({
    queryKey: ['fear-greed-index'],
    queryFn: fetchFearGreedIndex,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useVixIndex() {
  return useQuery({
    queryKey: ['vix-index'],
    queryFn: fetchVixData,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
