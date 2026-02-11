import { cn } from '@/lib/utils';
import type { AvailableTime } from '@/hooks/useAnalysisTimeOverride';

interface AnalysisTimeSelectorProps {
  availableTimes: AvailableTime[];
  selectedTime: string | null;
  onSelect: (time: string | null) => void;
  isLoading?: boolean;
}

export function AnalysisTimeSelector({
  availableTimes,
  selectedTime,
  onSelect,
  isLoading,
}: AnalysisTimeSelectorProps) {
  if (availableTimes.length <= 1) return null;

  // selectedTime이 null이면 earliest(기본)가 선택된 상태
  const effectiveSelected = selectedTime ?? availableTimes[0]?.time ?? null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
        분석 시간대
      </span>
      <div className="flex gap-1.5">
        {availableTimes.map((t) => {
          const isActive = effectiveSelected === t.time;
          return (
            <button
              key={t.time}
              onClick={() => onSelect(t.isEarliest ? null : t.time)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-bg-secondary text-text-muted hover:text-text-secondary hover:bg-bg-primary border border-border',
              )}
            >
              {t.label}
              {t.isEarliest && (
                <span className="ml-1 opacity-70">(기준)</span>
              )}
            </button>
          );
        })}
      </div>
      {isLoading && (
        <div className="animate-spin w-3.5 h-3.5 border-2 border-accent-primary border-t-transparent rounded-full flex-shrink-0" />
      )}
    </div>
  );
}
