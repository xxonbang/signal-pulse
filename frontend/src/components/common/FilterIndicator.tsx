import { Button } from './Button';
import type { SignalType } from '@/services/types';

export function FilterIndicator({
  signal,
  onClear
}: {
  signal: SignalType | null;
  onClear: () => void;
}) {
  if (!signal) return null;

  return (
    <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-bg-accent border border-accent-primary rounded-lg mb-3 md:mb-4 text-xs md:text-sm text-accent-primary">
      <span className="flex-1 font-medium">
        "{signal}" <span className="hidden sm:inline">시그널 </span>필터 적용 중
      </span>
      <Button variant="primary" size="sm" onClick={onClear}>
        해제
      </Button>
    </div>
  );
}
