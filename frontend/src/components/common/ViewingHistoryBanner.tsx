import { useUIStore } from '@/store/uiStore';

export function ViewingHistoryBanner({ dateTime }: { dateTime: string }) {
  const { resetToLatest } = useUIStore();

  // "2026-02-04_0700" → "2026-02-04 07:00"
  const [date, time] = dateTime.split('_');
  const displayTime = time ? `${time.slice(0, 2)}:${time.slice(2)}` : '';

  return (
    <div className="flex items-center justify-between gap-2 md:gap-3 bg-accent-primary text-white px-3 md:px-5 py-2.5 md:py-3 rounded-xl mb-4 md:mb-5" role="status">
      <span className="font-semibold text-xs md:text-base flex items-center gap-2">
        <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>
          {date} {displayTime && <span className="text-white/80">{displayTime}</span>}
          <span className="text-white/90"> 일시의 데이터 표시 중</span>
        </span>
      </span>
      <button
        onClick={resetToLatest}
        className="group flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2
          bg-white/20 border border-white/30 rounded-lg
          text-xs md:text-sm font-semibold
          hover:bg-white/30 hover:border-white/50
          active:scale-95
          transition-all duration-200"
      >
        <svg
          className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        <span className="hidden sm:inline">최신으로</span>
        <span className="sm:hidden">최신</span>
      </button>
    </div>
  );
}
