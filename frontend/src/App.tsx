import { useEffect, useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Navigation, Toast, ScrollToTop } from '@/components/common';
import { AnalysisTabs, Footer } from '@/components/layout';
import { HistoryPanel } from '@/components/history';
import { VisionAnalysis, APIAnalysis, AuthPage } from '@/pages';
import { LoadingSpinner } from '@/components/common';
import { useAuthStore } from '@/store/authStore';

// 청크 로드 실패(배포 후 해시 변경) 시 자동 새로고침
function lazyWithReload(factory: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {}); // reload 중 렌더 차단
      }
      sessionStorage.removeItem(key);
      return { default: () => null }; // 2회 연속 실패 시 빈 화면 (무한 루프 방지)
    })
  );
}

const CombinedAnalysis = lazyWithReload(() => import('@/pages/CombinedAnalysis').then(m => ({ default: m.CombinedAnalysis })));
const SimulationPage = lazyWithReload(() => import('@/pages/SimulationPage').then(m => ({ default: m.SimulationPage })));

import { useUIStore } from '@/store/uiStore';
import { useUserHistory } from '@/hooks/useUserHistory';
import { fetchLatestData, fetchKISData, fetchKISAnalysis, fetchHistoryIndex } from '@/services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5분간 데이터를 fresh로 유지
    },
  },
});

// 앱 로드 시 모든 데이터를 미리 prefetch하는 훅
function usePrefetchAllData() {
  const client = useQueryClient();

  useEffect(() => {
    // 백그라운드에서 모든 데이터 prefetch (병렬 실행)
    Promise.allSettled([
      client.prefetchQuery({
        queryKey: ['vision', 'latest'],
        queryFn: fetchLatestData,
      }),
      client.prefetchQuery({
        queryKey: ['kis-data'],
        queryFn: fetchKISData,
      }),
      client.prefetchQuery({
        queryKey: ['kis-analysis'],
        queryFn: fetchKISAnalysis,
      }),
      client.prefetchQuery({
        queryKey: ['history', 'index'],
        queryFn: fetchHistoryIndex,
      }),
    ]);
  }, [client]);
}

function MainContent() {
  const { activeTab } = useUIStore();

  // 지연 마운트: 탭을 한 번이라도 방문했는지 추적
  // 방문한 탭만 렌더링하고, 이후에는 CSS로 숨김 처리
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['vision']));

  useEffect(() => {
    if (!mountedTabs.has(activeTab)) {
      setMountedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, mountedTabs]);

  return (
    <>
      <AnalysisTabs />

      {/* Vision AI - 항상 마운트 */}
      <div style={{ display: activeTab === 'vision' ? 'block' : 'none' }}>
        <VisionAnalysis />
      </div>

      {/* API Analysis - 방문 시에만 마운트 */}
      {mountedTabs.has('api') && (
        <div style={{ display: activeTab === 'api' ? 'block' : 'none' }}>
          <APIAnalysis />
        </div>
      )}

      {/* Combined Analysis - 방문 시에만 마운트 (lazy loading) */}
      {mountedTabs.has('combined') && (
        <div style={{ display: activeTab === 'combined' ? 'block' : 'none' }}>
          <Suspense fallback={<LoadingSpinner message="분석 종합 로딩 중..." />}>
            <CombinedAnalysis />
          </Suspense>
        </div>
      )}
    </>
  );
}

function AppContent() {
  // 로그인 후 진입 시 스크롤 최상단으로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 앱 로드 시 모든 데이터 미리 로드
  usePrefetchAllData();
  useUserHistory();
  const { currentPage } = useUIStore();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navigation />
      {currentPage === 'home' && <HistoryPanel />}
      <Toast />

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-10">
        {currentPage === 'home' ? (
          <MainContent />
        ) : (
          <Suspense fallback={<LoadingSpinner message="모의투자 페이지 로딩 중..." />}>
            <SimulationPage />
          </Suspense>
        )}
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}

function AuthGuard() {
  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <LoadingSpinner message="세션 확인 중..." />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}
