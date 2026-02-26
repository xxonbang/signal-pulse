import type { RecentChange } from '@/services/types';

/** 최근 N일 등락률 표시 (날짜: 최신→과거 순으로 입력, 과거→최신 순으로 표시) */
export function RecentChanges({ changes }: { changes?: RecentChange[] }) {
  if (!changes || changes.length === 0) return null;

  // 과거→최신 순으로 뒤집기
  const sorted = [...changes].reverse();

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <span className="text-[0.65rem] md:text-xs text-text-muted flex-shrink-0">등락</span>
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {sorted.map((item) => {
          const rate = item.change_rate ?? 0;
          const isPositive = rate > 0;
          const isNegative = rate < 0;
          const color = isPositive ? 'text-red-600' : isNegative ? 'text-blue-600' : 'text-text-muted';
          const bg = isPositive ? 'bg-red-50' : isNegative ? 'bg-blue-50' : 'bg-gray-100';
          const sign = isPositive ? '+' : '';
          const dateLabel = item.date ? `${item.date.slice(4, 6)}/${item.date.slice(6, 8)}` : '';
          return (
            <div
              key={item.date}
              className={`flex flex-col items-center flex-1 min-w-0 px-0.5 md:px-1.5 py-1 md:py-1.5 rounded-md ${bg}`}
              title={`${dateLabel}: ${sign}${rate.toFixed(2)}%`}
            >
              <span className={`text-[0.6rem] md:text-xs font-semibold leading-none tabular-nums ${color}`}>
                {sign}{Math.abs(rate).toFixed(1)}%
              </span>
              <span className="text-[0.5rem] md:text-[0.6rem] text-text-muted leading-none mt-0.5 md:mt-1">
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
