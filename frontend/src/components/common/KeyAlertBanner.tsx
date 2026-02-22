import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { fetchKeyAlerts } from '@/services/api';

export function KeyAlertBanner() {
  const { isAdmin } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['key-alerts'],
    queryFn: fetchKeyAlerts,
    staleTime: 1000 * 60 * 5,
    enabled: isAdmin,
  });

  if (!isAdmin || dismissed || !data?.alerts?.length) return null;

  const latest = data.alerts[data.alerts.length - 1];

  return (
    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold">API 키 에러 {data.alerts.length}건</span>
          <span className="ml-2 text-red-400/70">({data.updated_at})</span>
          <p className="mt-1 text-red-400/80">
            [{latest.source}] {latest.message}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-red-400/60 hover:text-red-400"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
