import { useUIStore } from '@/store/uiStore';

export function Toast() {
  const { toast } = useUIStore();

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300]"
      style={{ pointerEvents: toast.isVisible ? 'auto' : 'none' }}
    >
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-3 px-4 py-2.5 bg-text-primary/95 text-white text-sm font-medium rounded-xl shadow-lg transition-opacity duration-300 ${
          toast.isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 체크 아이콘 */}
        <div className="flex items-center justify-center w-5 h-5 bg-status-success rounded-full flex-shrink-0">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        {/* 메시지 */}
        <span className="whitespace-nowrap">{toast.message}</span>
      </div>
    </div>
  );
}
