import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export function useUserHistory() {
  const user = useAuthStore((s) => s.user);
  const activeTab = useUIStore((s) => s.activeTab);
  const currentPage = useUIStore((s) => s.currentPage);
  const lastRecorded = useRef<string>('');

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const systemName = currentPage === 'simulation' ? 'simulation' : activeTab;

    // 동일 system 중복 호출 방지
    if (lastRecorded.current === systemName) return;
    lastRecorded.current = systemName;

    supabase.from('user_history').upsert(
      {
        user_id: user.id,
        email: user.email,
        system_name: systemName,
        accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,system_name' }
    );
  }, [user, activeTab, currentPage]);
}
