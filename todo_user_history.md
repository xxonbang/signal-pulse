## Supabase 사용자 사이트 이력 기록 기능

### 테이블 스키마

```sql
CREATE TABLE user_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  system_name text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, system_name)
);

-- RLS 활성화
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자가 자기 기록만 upsert 가능
CREATE POLICY "Users can upsert own history" ON user_history
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

- `UNIQUE(user_id, system_name)` — 사용자별 시스템당 1건만 유지
- upsert 시 `accessed_at`만 갱신되므로 최종 접속 시각을 추적

### React 훅 패턴

```ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserHistory(userId: string | undefined, email: string | undefined, systemName: string) {
  const lastRecorded = useRef<string>('');

  useEffect(() => {
    if (!userId || !email) return;

    // 동일 system 중복 호출 방지
    if (lastRecorded.current === systemName) return;
    lastRecorded.current = systemName;

    // fire-and-forget — 이력 기록 실패가 UX에 영향 주지 않도록
    supabase.from('user_history').upsert(
      {
        user_id: userId,
        email,
        system_name: systemName,
        accessed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,system_name' }
    );
  }, [userId, email, systemName]);
}
```

### 핵심 포인트

| 항목 | 설명 |
|------|------|
| upsert `onConflict` | `user_id,system_name` 복합 유니크 키 기준으로 중복 시 갱신 |
| `useRef` 중복 방지 | 같은 system_name 연속 호출 시 네트워크 요청 생략 |
| fire-and-forget | `await` 없이 호출하여 UI 블로킹/에러 전파 방지 |
| RLS 정책 | 인증된 사용자가 자기 `user_id` 레코드만 읽기/쓰기 가능 |
