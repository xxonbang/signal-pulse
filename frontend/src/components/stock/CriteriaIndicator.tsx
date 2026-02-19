import { useState } from 'react';
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

interface CriteriaIndicatorProps {
  criteria: StockCriteria;
  isCompact?: boolean;
}

export function CriteriaIndicator({ criteria, isCompact = false }: CriteriaIndicatorProps) {
  const [showPopup, setShowPopup] = useState(false);

  const metCriteria = CRITERIA_CONFIG.filter(
    (c) => (criteria[c.key as keyof StockCriteria] as CriterionResult)?.met
  );

  const unmetCriteria = CRITERIA_CONFIG.filter(
    (c) => !(criteria[c.key as keyof StockCriteria] as CriterionResult)?.met
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
    <div className="relative flex flex-wrap items-center gap-1 sm:gap-1.5 my-1">
      {metCriteria.map((config) => {
        const result = criteria[config.key as keyof StockCriteria] as CriterionResult;
        const is52w = config.key === 'high_breakout' && result.is_52w_high;

        return (
          <div key={config.key}>
            {/* Compact: 작은 도트 (클릭 가능) */}
            {isCompact ? (
              <button
                onClick={handleClick}
                className={cn('inline-block w-1.5 h-1.5 rounded-full', config.dotColor)}
              />
            ) : (
              <>
                {/* 모바일: 도트 */}
                <button
                  onClick={handleClick}
                  className={cn(
                    'sm:hidden inline-block w-2.5 h-2.5 rounded-full',
                    config.dotColor,
                  )}
                />
                {/* PC: 뱃지 */}
                <button
                  onClick={handleClick}
                  className={cn(
                    'hidden sm:inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium leading-none',
                    config.badgeBg, config.badgeText,
                  )}
                >
                  <span className={cn('inline-block w-1.5 h-1.5 rounded-full', config.dotColor)} />
                  {is52w ? '52주 신고가' : config.label}
                </button>
              </>
            )}
          </div>
        );
      })}

      {/* 통합 팝업: 충족 + 미충족 기준 */}
      {showPopup && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-72 sm:w-80 bg-white border border-border rounded-lg shadow-lg p-3 max-h-80 overflow-y-auto"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary">종목 기준 평가</span>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              X
            </button>
          </div>

          {/* 충족 기준 */}
          <p className="text-[10px] font-medium text-green-600 mb-1.5">충족 ({metCriteria.length})</p>
          <div className="space-y-1.5">
            {metCriteria.map((config) => {
              const result = criteria[config.key as keyof StockCriteria] as CriterionResult;
              const is52w = config.key === 'high_breakout' && result.is_52w_high;
              return (
                <div key={config.key}>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', config.dotColor)} />
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
