import { useState } from 'react';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import { useAuthStore } from '@/store/authStore';
import type { MarketIndexStatus } from '@/services/types';

const STATUS_STYLES = {
  bullish: 'from-emerald-500/10 to-emerald-600/5 border-emerald-300/60 text-emerald-800',
  bearish: 'from-red-500/10 to-red-600/5 border-red-300/60 text-red-800',
  mixed: 'from-gray-400/10 to-gray-500/5 border-gray-300/60 text-gray-700',
  unknown: '',
} as const;

const STATUS_LABELS = {
  bullish: '정배열',
  bearish: '역배열',
  mixed: '혼조',
  unknown: '',
} as const;

const STATUS_BADGE = {
  bullish: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  bearish: 'bg-red-100 text-red-700 border-red-300',
  mixed: 'bg-gray-100 text-gray-600 border-gray-300',
  unknown: '',
} as const;

function IndexCard({ data, label, icon }: { data: MarketIndexStatus; label: string; icon: string }) {
  const [open, setOpen] = useState(false);

  if (data.status === 'unknown') return null;

  const style = STATUS_STYLES[data.status];
  const badge = STATUS_BADGE[data.status];
  const statusLabel = STATUS_LABELS[data.status];

  return (
    <div className={`bg-gradient-to-r ${style} border rounded-lg overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer"
      >
        <span className="text-base flex-shrink-0">{icon}</span>
        <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">{label} 지수 이동평균선</span>
        <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${badge}`}>
          {statusLabel}
        </span>
        <span className="ml-auto font-bold text-sm sm:text-base tabular-nums flex-shrink-0">
          {data.current?.toFixed(2)}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-24' : 'max-h-0'}`}>
        <div className="px-3 pb-2.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-sm">
          <span><span className="font-semibold">현재</span> <span className="tabular-nums">{data.current?.toFixed(2)}</span></span>
          {Object.entries(data.ma_values).map(([k, v]) => (
            <span key={k} className="opacity-75">
              <span className="font-medium">{k}</span> <span className="tabular-nums">{v.toFixed(2)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KosdaqStatusBanner() {
  const { isAdmin } = useAuthStore();
  const { data: marketStatus } = useMarketStatus();

  if (!isAdmin || !marketStatus) return null;

  const hasKospi = marketStatus.kospi?.status && marketStatus.kospi.status !== 'unknown';
  const hasKosdaq = marketStatus.kosdaq?.status && marketStatus.kosdaq.status !== 'unknown';

  if (!hasKospi && !hasKosdaq) return null;

  return (
    <div className="flex flex-col gap-2 mb-3">
      {hasKospi && <IndexCard data={marketStatus.kospi} label="코스피" icon="📈" />}
      {hasKosdaq && <IndexCard data={marketStatus.kosdaq} label="코스닥" icon="📊" />}
    </div>
  );
}
