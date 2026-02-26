import { useState, useRef, useEffect } from 'react';
import type { StockCriteria, CriterionResult } from '@/services/types';
import { cn } from '@/lib/utils';

const CRITERIA_CONFIG = [
  { key: 'high_breakout', dotColor: 'bg-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700', label: '전고점', fullLabel: '전고점 돌파' },
  { key: 'supply_demand', dotColor: 'bg-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', label: '수급', fullLabel: '외국인/기관 수급' },
  { key: 'program_trading', dotColor: 'bg-violet-500', badgeBg: 'bg-violet-100', badgeText: 'text-violet-700', label: '프로그램', fullLabel: '프로그램 매매' },
  { key: 'momentum_history', dotColor: 'bg-orange-500', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', label: '끼', fullLabel: '끼 보유' },
  { key: 'resistance_breakout', dotColor: 'bg-yellow-400', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', label: '저항선', fullLabel: '저항선 돌파' },
  { key: 'ma_alignment', dotColor: 'bg-teal-500', badgeBg: 'bg-teal-100', badgeText: 'text-teal-700', label: '정배열', fullLabel: '이동평균선 정배열' },
  { key: 'top30_trading_value', dotColor: 'bg-fuchsia-500', badgeBg: 'bg-fuchsia-100', badgeText: 'text-fuchsia-700', label: 'TOP30', fullLabel: '거래대금 TOP30' },
  { key: 'market_cap_range', dotColor: 'bg-lime-500', badgeBg: 'bg-lime-100', badgeText: 'text-lime-700', label: '시총', fullLabel: '시가총액 적정 범위' },
] as const;

const ALERT_CONFIG = [
  { key: 'short_selling_alert', dotColor: 'bg-red-500', label: '공매도 경고' },
  { key: 'overheating_alert', dotColor: 'bg-orange-500', label: '과열 경고' },
  { key: 'reverse_ma_alert', dotColor: 'bg-violet-500', label: '역배열 경고' },
] as const;

interface CriteriaIndicatorProps {
  criteria: StockCriteria;
  isCompact?: boolean;
}

export function CriteriaIndicator({ criteria, isCompact = false }: CriteriaIndicatorProps) {
  const [showPopup, setShowPopup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기 (capture phase → stopPropagation 영향 안 받음)
  useEffect(() => {
    if (!showPopup) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => document.removeEventListener('click', handleOutsideClick, true);
  }, [showPopup]);

  // 팝업이 뷰포트 밖으로 나가면 위치 보정
  useEffect(() => {
    if (!showPopup || !popupRef.current) return;
    const popup = popupRef.current;
    // 이전 보정 초기화
    popup.style.left = '';
    popup.style.right = '';
    popup.style.top = '';
    popup.style.bottom = '';
    popup.style.marginTop = '';
    popup.style.marginBottom = '';

    const rect = popup.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      popup.style.left = 'auto';
      popup.style.right = '0';
    }
    if (rect.bottom > window.innerHeight - 8) {
      popup.style.top = 'auto';
      popup.style.bottom = '100%';
      popup.style.marginTop = '0';
      popup.style.marginBottom = '4px';
    }
  }, [showPopup]);

  const metCriteria = CRITERIA_CONFIG.filter(
    (c) => (criteria[c.key as keyof StockCriteria] as CriterionResult)?.met
  );

  const unmetCriteria = CRITERIA_CONFIG.filter(
    (c) => !(criteria[c.key as keyof StockCriteria] as CriterionResult)?.met
  );

  const activeAlerts = ALERT_CONFIG.filter(
    (a) => (criteria[a.key as keyof StockCriteria] as CriterionResult | undefined)?.met
  );

  if (metCriteria.length === 0) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup(!showPopup);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopup(false);
  };

  return (
    <div className="relative my-1" ref={containerRef}>
      <button
        onClick={handleClick}
        className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 -my-1 cursor-pointer"
      >
        {metCriteria.map((config) => {
          const result = criteria[config.key as keyof StockCriteria] as CriterionResult;
          const is52w = config.key === 'high_breakout' && result.is_52w_high;

          return (
            <span key={config.key}>
              {/* Compact: 작은 도트 (52주 신고가면 👑) */}
              {isCompact ? (
                is52w
                  ? <span className="text-[10px] leading-none">👑</span>
                  : <span className={cn('inline-block w-1.5 h-1.5 rounded-full', config.dotColor)} />
              ) : (
                <>
                  {/* 모바일: 도트 (52주 신고가면 👑) */}
                  {is52w
                    ? <span className="sm:hidden text-sm leading-none">👑</span>
                    : <span className={cn('sm:hidden inline-block w-2.5 h-2.5 rounded-full', config.dotColor)} />
                  }
                  {/* PC: 뱃지 */}
                  <span className={cn(
                    'hidden sm:inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none',
                    is52w ? 'bg-amber-100 text-amber-700' : config.badgeBg,
                    is52w ? '' : config.badgeText,
                  )}>
                    {is52w
                      ? <span className="text-[9px] leading-none">👑</span>
                      : <span className={cn('inline-block w-1.5 h-1.5 rounded-full', config.dotColor)} />
                    }
                    {is52w ? '52주 신고가' : config.label}
                  </span>
                </>
              )}
            </span>
          );
        })}
      </button>

      {/* 통합 팝업: 충족 + 미충족 기준 */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute top-full left-0 mt-1 z-50 w-72 sm:w-80 bg-white border border-border rounded-lg shadow-lg p-3 max-h-80 overflow-y-auto"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary">종목 기준 평가</span>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-7 h-7 -mr-1 rounded-full text-text-muted hover:text-text-primary hover:bg-gray-100 text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 경고 표시 */}
          {activeAlerts.length > 0 && (
            <>
              <div className="space-y-1.5 mb-2">
                {activeAlerts.map((alert) => {
                  const result = criteria[alert.key as keyof StockCriteria] as CriterionResult;
                  return (
                    <div key={alert.key} className="flex items-start gap-1.5 bg-red-50 rounded px-2 py-1.5">
                      <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0 mt-0.5', alert.dotColor)} />
                      <div>
                        <span className="text-[11px] font-medium text-red-700">{alert.label}</span>
                        <p className="text-[10px] text-red-600 leading-relaxed">
                          {result.reason || '상세 정보 없음'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border my-2" />
            </>
          )}

          {/* 충족 기준 */}
          <p className="text-[10px] font-medium text-green-600 mb-1.5">충족 ({metCriteria.length})</p>
          <div className="space-y-1.5">
            {metCriteria.map((config) => {
              const result = criteria[config.key as keyof StockCriteria] as CriterionResult;
              const is52w = config.key === 'high_breakout' && result.is_52w_high;
              return (
                <div key={config.key}>
                  <div className="flex items-center gap-1.5">
                    {is52w
                      ? <span className="text-xs leading-none flex-shrink-0">👑</span>
                      : <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', config.dotColor)} />
                    }
                    <span className="text-[11px] font-medium text-text-primary">
                      {is52w ? '52주 신고가 돌파' : config.fullLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed ml-3.5">
                    {result.reason || '근거 없음'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 미충족 기준 */}
          {unmetCriteria.length > 0 && (
            <>
              <div className="border-t border-border my-2" />
              <p className="text-[10px] font-medium text-gray-400 mb-1.5">미충족 ({unmetCriteria.length})</p>
              <div className="space-y-1.5">
                {unmetCriteria.map((config) => {
                  const result = criteria[config.key as keyof StockCriteria] as CriterionResult | undefined;
                  return (
                    <div key={config.key}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
                        <span className="text-[11px] font-medium text-text-muted">{config.fullLabel}</span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed ml-3.5">
                        {result?.reason || '데이터 없음'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
