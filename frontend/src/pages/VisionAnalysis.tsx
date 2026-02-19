import { useVisionData } from '@/hooks/useVisionData';
import { useHistoryData } from '@/hooks/useHistoryData';
import { useCriteriaData } from '@/hooks/useCriteriaData';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner, EmptyState, Button, AnimatedNumber, KosdaqStatusBanner } from '@/components/common';
import { SignalSummary } from '@/components/signal';
import { MarketTabs, StockList, CriteriaLegend } from '@/components/stock';
import { getSignalCounts, getFilteredStocks, categorizeStocks, getLatestAnalysisTime, formatTimeOnly } from '@/lib/utils';
import type { AnalysisData, SignalType, StockCriteria } from '@/services/types';

function TipText({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.7rem] md:text-[0.8125rem] text-text-secondary flex items-start gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed mb-3 md:mb-4">
      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-slate-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
      </svg>
      <span className="flex-1">{children}</span>
    </div>
  );
}

function FilterIndicator({
  activeSignal,
  onClear
}: {
  activeSignal: SignalType | null;
  onClear: () => void;
}) {
  if (!activeSignal) return null;

  return (
    <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-bg-accent border border-accent-primary rounded-lg mb-3 md:mb-4 text-xs md:text-sm text-accent-primary">
      <span className="flex-1 font-medium">
        🔍 "{activeSignal}" <span className="hidden sm:inline">시그널 </span>필터 적용 중
      </span>
      <Button variant="primary" size="sm" onClick={onClear}>
        해제
      </Button>
    </div>
  );
}

function ViewingHistoryBanner({ dateTime }: { dateTime: string }) {
  const { resetToLatest } = useUIStore();

  // "2026-02-04_0700" → "2026-02-04 07:00"
  const [date, time] = dateTime.split('_');
  const displayTime = time ? `${time.slice(0, 2)}:${time.slice(2)}` : '';

  return (
    <div className="flex items-center justify-between gap-2 md:gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 md:px-5 py-2.5 md:py-3 rounded-xl mb-4 md:mb-5">
      <span className="font-semibold text-xs md:text-base flex items-center gap-2">
        <span className="text-base md:text-lg">📅</span>
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

      <FilterIndicator activeSignal={activeSignal} onClear={clearSignalFilter} />

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
