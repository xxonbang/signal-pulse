import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import type { AnalysisTab } from '@/services/types';

const tabs: { key: AnalysisTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    key: 'vision', label: 'Vision AI 분석', shortLabel: 'Vision',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" opacity="0"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>,
  },
  {
    key: 'api', label: '한투 API 분석', shortLabel: 'API',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  },
  {
    key: 'combined', label: '분석종합', shortLabel: '종합',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  },
];

export function AnalysisTabs() {
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <div className="mb-6">
      <div className="flex gap-1 bg-bg-secondary p-1 rounded-xl border border-border" role="tablist" aria-label="분석 유형 선택">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 md:gap-2',
              activeTab === tab.key
                ? 'bg-accent-primary text-white'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-primary'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
