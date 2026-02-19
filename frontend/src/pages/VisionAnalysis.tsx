import { useVisionData } from '@/hooks/useVisionData';
import { useHistoryData } from '@/hooks/useHistoryData';
import { useCriteriaData } from '@/hooks/useCriteriaData';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner, EmptyState, AnimatedNumber, KosdaqStatusBanner, TipText, ViewingHistoryBanner, FilterIndicator } from '@/components/common';

import { SignalSummary } from '@/components/signal';
import { MarketTabs, StockList, CriteriaLegend } from '@/components/stock';
import { getSignalCounts, getFilteredStocks, categorizeStocks, getLatestAnalysisTime, formatTimeOnly } from '@/lib/utils';
import type { AnalysisData, StockCriteria } from '@/services/types';

function ResultsMeta({ data }: { data: AnalysisData }) {
  const latestTime = getLatestAnalysisTime(data.results);
  const timeDisplay = latestTime ? formatTimeOnly(latestTime) : '';

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-5">
      <div className="bg-bg-secondary border border-border rounded-xl px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3 shadow-sm">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center text-base md:text-xl flex-shrink-0">
          📅
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.6rem] md:text-[0.65rem] text-text-muted uppercase tracking-wide font-semibold">
            분석 일시
          </div>
          <div className="text-sm md:text-base font-bold text-text-primary">
            {data.date}
          </div>
          {timeDisplay && (
            <div className="text-[0.65rem] md:text-xs text-text-muted font-medium">{timeDisplay}</div>
          )}
        </div>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3 shadow-sm">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-base md:text-xl flex-shrink-0">
          📊
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.6rem] md:text-[0.65rem] text-text-muted uppercase tracking-wide font-semibold">
            분석 종목
          </div>
          <div className="text-sm md:text-base font-bold text-text-primary"><AnimatedNumber value={data.total_stocks} duration={500} />개</div>
        </div>
      </div>
    </div>
  );
}

function AnalysisContent({ data, criteriaData, isAdmin }: { data: AnalysisData; criteriaData: Record<string, StockCriteria> | null; isAdmin: boolean }) {
  const { activeMarket, setMarketFilter, activeSignal, toggleSignalFilter, clearSignalFilter } = useUIStore();

  const { kospi, kosdaq } = categorizeStocks(data.results);
  const signalCounts = getSignalCounts(data.results, activeMarket);
  const filteredStocks = getFilteredStocks(data.results, activeMarket, activeSignal);

  const marketCounts = {
    all: data.results.length,
    kospi: kospi.length,
    kosdaq: kosdaq.length,
  };

  return (
    <>
      <ResultsMeta data={data} />

      <SignalSummary
        counts={signalCounts}
        activeSignal={activeSignal}
        onFilter={toggleSignalFilter}
      />

      <CriteriaLegend isAdmin={isAdmin} hasCriteriaData={!!criteriaData} />

      <TipText>
        시그널 카드를 클릭하면 필터가 적용되어, 해당되는 종목만 확인 가능합니다
      </TipText>

      <MarketTabs
        active={activeMarket}
        counts={marketCounts}
        onChange={setMarketFilter}
      />

      <FilterIndicator signal={activeSignal} onClear={clearSignalFilter} />

      {filteredStocks.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="해당 조건의 종목이 없습니다"
          description={
            activeSignal
              ? `${activeMarket === 'kospi' ? '코스피' : activeMarket === 'kosdaq' ? '코스닥' : '전체'} 시장에서 "${activeSignal}" 시그널 종목을 찾을 수 없습니다.`
              : `${activeMarket === 'kospi' ? '코스피' : activeMarket === 'kosdaq' ? '코스닥' : '전체'} 시장에 분석된 종목이 없습니다.`
          }
        />
      ) : (
        <>
          <TipText>
            종목명을 클릭하면 네이버 금융에서 해당 종목의 실시간 정보 화면으로 이동합니다
          </TipText>
          <StockList stocks={filteredStocks} criteriaData={isAdmin ? criteriaData : null} />
        </>
      )}
    </>
  );
}

export function VisionAnalysis() {
  const { isViewingHistory, viewingHistoryDateTime } = useUIStore();
  const { data: criteriaData } = useCriteriaData();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  // viewingHistoryDateTime: "2026-02-04_0700" → filename: "vision_2026-02-04_0700.json"
  const historyFilename = viewingHistoryDateTime ? `vision_${viewingHistoryDateTime}.json` : null;

  const { data: latestData, isLoading: latestLoading, error: latestError } = useVisionData();
  const { data: historyData, isLoading: historyLoading } = useHistoryData(historyFilename);

  const isLoading = isViewingHistory ? historyLoading : latestLoading;
  const data = isViewingHistory ? historyData : latestData;
  const error = latestError;

  return (
    <section id="results" className="mb-8 md:mb-10">
      <div className="flex justify-between items-center mb-4 md:mb-5 flex-wrap gap-2 md:gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-text-primary mb-0.5 md:mb-1">Vision AI 분석</h2>
          <p className="text-xs md:text-sm text-text-muted">네이버 금융 스크린샷 + Gemini Vision 분석</p>
        </div>
      </div>

      {isViewingHistory && viewingHistoryDateTime && (
        <ViewingHistoryBanner dateTime={viewingHistoryDateTime} />
      )}

      <KosdaqStatusBanner />

      {isLoading && <LoadingSpinner message="분석 결과를 불러오는 중..." />}

      {error && !isLoading && (
        <EmptyState
          icon="📊"
          title="분석 결과가 아직 없습니다"
          description="GitHub Actions가 실행되면 여기에 최신 분석 결과가 표시됩니다."
        />
      )}

      {data && !isLoading && <AnalysisContent data={data} criteriaData={criteriaData ?? null} isAdmin={isAdmin} />}
    </section>
  );
}
