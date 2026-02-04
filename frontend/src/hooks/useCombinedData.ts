import { useQuery } from '@tanstack/react-query';
import { fetchCombinedAnalysis, fetchCombinedHistoryData, fetchCombinedHistoryIndex } from '@/services/api';

export function useCombinedData() {
  return useQuery({
    queryKey: ['combined', 'latest'],
    queryFn: fetchCombinedAnalysis,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useCombinedHistoryIndex() {
  return useQuery({
    queryKey: ['combined-history', 'index'],
    queryFn: fetchCombinedHistoryIndex,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

export function useCombinedHistoryData(filename: string | null) {
  return useQuery({
    queryKey: ['combined-history', filename],
    queryFn: () => fetchCombinedHistoryData(filename!),
    enabled: !!filename,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}
