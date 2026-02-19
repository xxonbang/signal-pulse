import { useQuery } from '@tanstack/react-query';
import { fetchMarketStatus } from '@/services/api';

export function useMarketStatus() {
  return useQuery({
    queryKey: ['market-status'],
    queryFn: fetchMarketStatus,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
