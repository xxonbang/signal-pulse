import { cn } from '@/lib/utils';
import type { SignalType } from '@/services/types';

interface SignalBadgeProps {
  signal: SignalType;
  size?: 'sm' | 'md';
  className?: string;
}

export function SignalBadge({ signal, size = 'md', className }: SignalBadgeProps) {
  const colorClasses: Record<SignalType, string> = {
    '적극매수': 'bg-signal-bg-strong-buy text-signal-strong-buy',
    '매수': 'bg-signal-bg-buy text-signal-buy',
    '중립': 'bg-signal-bg-neutral text-signal-neutral',
    '매도': 'bg-signal-bg-sell text-signal-sell',
    '적극매도': 'bg-signal-bg-strong-sell text-signal-strong-sell',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 rounded-lg text-[0.6875rem] font-medium',
    md: 'px-2 md:px-3 py-0.5 md:py-1 rounded-2xl text-xs font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap',
        sizeClasses[size],
        colorClasses[signal],
        className
      )}
    >
      {signal}
    </span>
  );
}
