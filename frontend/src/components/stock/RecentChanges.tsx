import type { RecentChange } from '@/services/types';

/** 최근 N일 등락률 표시 (날짜: 최신→과거 순으로 입력, 과거→최신 순으로 표시) */
export function RecentChanges({ changes }: { changes?: RecentChange[] }) {
  if (!changes || changes.length === 0) return null;

  const sorted = [...changes].reverse();

  return (
    <div className="flex items-center gap-1">
      <span className="text-[0.6rem] md:text-[0.65rem] text-text-muted/60 font-semibold tracking-wider uppercase flex-shrink-0">
        등락
      </span>
      <div className="flex items-center gap-[3px] flex-1 min-w-0 overflow-x-auto">
        {sorted.map((item) => {
          const rate = item.change_rate ?? 0;
          const isPositive = rate > 0;
          const isNegative = rate < 0;
          const color = isPositive ? 'text-red-600' : isNegative ? 'text-blue-600' : 'text-text-muted/70';
          const sign = isPositive ? '+' : '';
          const dateLabel = item.date ? `${item.date.slice(4, 6)}/${item.date.slice(6, 8)}` : '';

          // 변동률 크기에 비례한 배경 강도
          const absRate = Math.abs(rate);
          const intensity = Math.min(absRate / 15, 1); // 15% 이상이면 최대 강도
          const bgColor = isPositive
            ? `rgba(239, 68, 68, ${0.04 + intensity * 0.1})`
            : isNegative
              ? `rgba(59, 130, 246, ${0.04 + intensity * 0.1})`
              : 'rgba(156, 163, 175, 0.06)';

          return (
            <div
              key={item.date}
              className="flex flex-col items-center flex-1 min-w-[2.5rem] py-1 px-0.5 rounded"
              style={{ backgroundColor: bgColor }}
              title={`${dateLabel}: ${sign}${rate.toFixed(2)}%`}
            >
              <span className={`text-[0.6rem] md:text-[0.65rem] font-bold leading-none tabular-nums ${color}`}>
                {sign}{Math.abs(rate).toFixed(1)}%
              </span>
              <span className="text-[0.55rem] md:text-[0.6rem] text-text-muted/50 leading-none mt-0.5 tabular-nums">
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
