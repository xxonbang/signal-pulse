import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/common';
import type { SignalType } from '@/services/types';

interface SignalCardProps {
  signal: SignalType;
  count: number;
  active?: boolean;
  onClick?: () => void;
}

const signalConfig: Record<SignalType, {
  label: string;
  colorClass: string;
  icon: React.ReactNode;
}> = {
  '적극매수': {
    label: '적극매수',
    colorClass: 'strong-buy',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>
      </svg>
    ),
  },
  '매수': {
    label: '매수',
    colorClass: 'buy',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    ),
  },
  '중립': {
    label: '중립',
    colorClass: 'neutral',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"/>
      </svg>
    ),
  },
  '매도': {
    label: '매도',
    colorClass: 'sell',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    ),
  },
  '적극매도': {
    label: '적극매도',
    colorClass: 'strong-sell',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
      </svg>
    ),
  },
};

const colorStyles: Record<string, {
  base: string;
  hover: string;
  active: string;
  bar: string;
  icon: string;
  text: string;
}> = {
  'strong-buy': {
    base: 'border-signal-strong-buy/20',
    hover: 'hover:border-signal-strong-buy/40 hover:shadow-signal-strong-buy/10',
    active: 'border-signal-strong-buy bg-signal-strong-buy/5',
    bar: 'bg-signal-strong-buy',
    icon: 'bg-signal-strong-buy/10 text-signal-strong-buy',
    text: 'text-signal-strong-buy',
  },
  'buy': {
    base: 'border-signal-buy/20',
    hover: 'hover:border-signal-buy/40 hover:shadow-signal-buy/10',
    active: 'border-signal-buy bg-signal-buy/5',
    bar: 'bg-signal-buy',
    icon: 'bg-signal-buy/10 text-signal-buy',
    text: 'text-signal-buy',
  },
  'neutral': {
    base: 'border-signal-neutral/20',
    hover: 'hover:border-signal-neutral/40 hover:shadow-signal-neutral/10',
    active: 'border-signal-neutral bg-signal-neutral/5',
    bar: 'bg-signal-neutral',
    icon: 'bg-signal-neutral/10 text-signal-neutral',
    text: 'text-signal-neutral',
  },
  'sell': {
    base: 'border-signal-sell/20',
    hover: 'hover:border-signal-sell/40 hover:shadow-signal-sell/10',
    active: 'border-signal-sell bg-signal-sell/5',
    bar: 'bg-signal-sell',
    icon: 'bg-signal-sell/10 text-signal-sell',
    text: 'text-signal-sell',
  },
  'strong-sell': {
    base: 'border-signal-strong-sell/20',
    hover: 'hover:border-signal-strong-sell/40 hover:shadow-signal-strong-sell/10',
    active: 'border-signal-strong-sell bg-signal-strong-sell/5',
    bar: 'bg-signal-strong-sell',
    icon: 'bg-signal-strong-sell/10 text-signal-strong-sell',
    text: 'text-signal-strong-sell',
  },
};

export function SignalCard({ signal, count, active = false, onClick }: SignalCardProps) {
  const config = signalConfig[signal];
  const styles = colorStyles[config.colorClass];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-bg-secondary rounded-xl md:rounded-2xl py-3 px-1 md:py-5 md:px-4 text-center',
        'transition-[border-color,box-shadow,transform] duration-300 ease-out cursor-pointer overflow-hidden border',
        'shadow-sm hover:-translate-y-1 hover:shadow-lg',
        styles.base,
        styles.hover,
        active && styles.active,
      )}
    >
      {/* Top bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 md:h-1.5 rounded-t-xl md:rounded-t-2xl', styles.bar)} />

      {/* Icon */}
      <div className={cn(
        'w-7 h-7 md:w-10 md:h-10 rounded-lg flex items-center justify-center mx-auto mb-1.5 md:mb-3 transition-transform',
        styles.icon,
        'group-hover:scale-105'
      )}>
        {config.icon}
      </div>

      {/* Count */}
      <div className={cn('text-lg md:text-4xl font-extrabold mb-0.5 md:mb-1 tracking-tight', styles.text)}>
        <AnimatedNumber value={count} duration={500} />
      </div>

      {/* Label */}
      <div className={cn('text-xs font-semibold uppercase tracking-wide', styles.text)}>
        {config.label}
      </div>

      {/* Active indicator */}
      {active && (
        <div className={cn('absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full opacity-50', styles.bar)} />
      )}
    </div>
  );
}
