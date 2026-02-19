import { useMarketStatus } from '@/hooks/useMarketStatus';
import { useAuthStore } from '@/store/authStore';

const STATUS_STYLES = {
  bullish: 'from-emerald-500/10 to-emerald-600/5 border-emerald-400/40 text-emerald-700',
  bearish: 'from-red-500/10 to-red-600/5 border-red-400/40 text-red-700',
  mixed: 'from-gray-400/10 to-gray-500/5 border-gray-300/40 text-gray-600',
  unknown: '',
} as const;

const STATUS_LABELS = {
  bullish: '정배열',
  bearish: '역배열',
  mixed: '혼조',
  unknown: '',
} as const;

export function KosdaqStatusBanner() {
  const { isAdmin } = useAuthStore();
  const { data: marketStatus } = useMarketStatus();

  if (!isAdmin || !marketStatus || marketStatus.status === 'unknown') return null;

  const style = STATUS_STYLES[marketStatus.status];
  const label = STATUS_LABELS[marketStatus.status];

  return (
    <div className={`bg-gradient-to-r ${style} border rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-xs sm:text-sm`}>
      <span className="font-semibold whitespace-nowrap">KOSDAQ {label}</span>
      <span className="text-[10px] sm:text-xs opacity-75 truncate">
        {marketStatus.current?.toFixed(2)} | {Object.entries(marketStatus.ma_values).map(([k, v]) => `${k}:${v.toFixed(0)}`).join(' ')}
      </span>
    </div>
  );
}
