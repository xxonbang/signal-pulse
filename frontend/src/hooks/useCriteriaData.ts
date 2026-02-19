import { useQuery } from '@tanstack/react-query';
import { fetchCriteriaData } from '@/services/api';

export function useCriteriaData() {
  return useQuery({
    queryKey: ['criteria-data'],
    queryFn: fetchCriteriaData,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
